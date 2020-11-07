const fetch = require('node-fetch');
const cheerio = require('cheerio');
const Datastore = require('nedb-promises');
const path = require('path');
const express = require('express');
const fs = require('fs').promises;

const datastore = Datastore.create(path.join(__dirname, 'data.db'));

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const config = require(path.join(__dirname, 'config.json'));

if(!config.orderId || !config.postcode) {
  console.error('Incorrect config, missing either orderId or postcode, pleas check config.json')
}

app.use(express.static(path.join(__dirname, 'static')))

io.on('connection', async socket => {
  const data = (await datastore.find({}).sort({time: 1})).map(doc => ({
    time: doc.time,
    pos: doc.pos,
    queue: doc.queue,
  }));
  let product = 'Unknown product';
  try {
    product = JSON.parse((await fs.readFile(path.join(__dirname, 'data.json'))).toString()).product
  } catch(e) {}
  socket.emit('update', {
    product,
    points: data
  });
});

const appendZeros = (n, z = 2) => ('0'.repeat(z) + n).slice(-z)

const getDate = () => {
  const date = new Date();
  return `${appendZeros(date.getHours())}:${appendZeros(date.getMinutes())}:${appendZeros(date.getSeconds())}.${appendZeros(date.getMilliseconds(),3)}`;
}

const getPosition = async () => {
  console.log(`${getDate()} fetching queue position...`);
  const res = await fetch('https://www.megekko.nl/scripts/wachtrij/wachtrij.php', {
    method: 'POST',
    headers: {
      'origin': 'https://www.megekko.nl',
      'referer': 'https://www.megekko.nl/info/RTX-3080',
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36',
      'content-type': 'application/x-www-form-urlencoded',
      'content-length': '48',
    },
    body: `ajax=lookup&orderid=${config.orderId}&postcode=${config.postcode}`
  }).then(res => res.json());

  if(res.status === 'ok') {
    const $ = cheerio.load(res.data);

    const product = $($('div')[5]).text();
    const position = $($('div')[7]).text();

    const match = /^(\d+)[^\d]+(\d+)$/.exec(position);
    const currentPosition = match[1];
    const queueLength = match[2];

    console.log(
      `${getDate()} Current position ${currentPosition}, Queue length ${queueLength}`
    )

    fs.writeFile(path.join(__dirname, 'data.json'), JSON.stringify({
      product
    }))

    const doc = {
      time: Date.now(),
      pos: currentPosition,
      queue: queueLength,
    };

    await datastore.insert(doc);

    io.emit('update', {
      product,
      points: (await datastore.find({}).sort({time: 1})).map(doc => ({
        time: doc.time,
        pos: doc.pos,
        queue: doc.queue,
      }))
    });

  } else {
    console.log(`${getDate()} request failed`, res);
  }
}

setInterval(getPosition, 1000 * 60 * 10)

getPosition();

server.listen(3000);