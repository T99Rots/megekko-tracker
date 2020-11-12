const socket = io();
const positionElem = document.getElementById('position'); 
const queueElem = document.getElementById('queue'); 
const productNameElem = document.getElementById('product-name'); 
const timeElem = document.getElementById('time');
// const chartElem = document.getElementById('time-chart');

const formatter = Intl.DateTimeFormat('en-US', {
  hour: 'numeric', minute: 'numeric', second: 'numeric'
})

var chart = new CanvasJS.Chart("chartContainer", {
  animationEnabled: true,
  backgroundColor: 'rgba(0,0,0,0)',
  theme: 'dark1',
	axisX: {
    valueFormatString: "DD MMM HH:mm",
    labelFontFamily: 'Goldman',
    labelFontSize: 16
  },
  axisY: {
    labelFontFamily: 'Goldman',
    labelFontSize: 16
  },
	legend:{
		cursor: "pointer",
		fontSize: 16,
    itemclick: toggleDataSeries,
    labelFontFamily: 'Goldman',
    fontFamily: 'Goldman',
    fontWeight: 'normal'
	},
	toolTip:{
    shared: true,
    fontFamily: 'Goldman'
	},
	data: [{
		name: "Position in queue",
    type: "spline",
    color: '#428bad',
		showInLegend: true,
		dataPoints: [
      {x: new Date(), y: 0},
		]
	},
	{
		name: "Queue length",
    type: "spline",
    color: '#ec2c9d',
		showInLegend: true,
		dataPoints: [
			{x: new Date(), y: 0},
		]
	}]
});

chart.render();

console.log(chart);

function toggleDataSeries(e){
	if (typeof(e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
		e.dataSeries.visible = false;
	}
	else{
		e.dataSeries.visible = true;
	}
	chart.render();
}

socket.on('update', (data) => {
  if(data.points.length < 1) return;
  const lastUpdate = data.points[data.points.length - 1];
  positionElem.innerText = lastUpdate.pos;
  queueElem.innerText = lastUpdate.queue;
  productNameElem.innerText = data.product;
  timeElem.innerText = formatter.format(new Date(lastUpdate.time));

  const points1 = data.points.map(point => ({
    x: new Date(point.time),
    y: +point.pos
  }))

  const points2 = data.points.map(point => ({
    x: new Date(point.time),
    y: +point.queue
  }));

  chart.options.data[0].dataPoints = points1;

  chart.options.data[1].dataPoints = points2;

  chart.render();
});
