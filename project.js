let client;
let isConnected = false;
let isReceiving = false;

/* MQTT DETAILS */
const host = "dd4cf6d1fe974d8e8652073f1ed06c3b.s1.eu.hivemq.cloud";
const port = 8884;
const username = "apurv-anand";
const password = "ESP32data";
const topic = "esp32/data";

/* GRAPH STATES */
let showFCG = false;
let showSCG = false;
let showPCG = false;

/* CHART OBJECTS */
let fcgChart, scgAxChart, scgAyChart, scgAzChart, pcgChart;

const incoming_data=[];

function updateCSV(){
  if(!incoming_data.length){
    return;
  }
  let csv= "Time, Piezo, Ax, Ay, Az\n";
  incoming_data.forEach(row =>{
    csv+= '${row.time}, ${row.piezo}, ${row.ax}, ${row.ay}, ${row.az}\n';
  });
  const blob= new Blob([csv], {type: "text/csv"} );
  const url= URL.createObjectURL(blob);
  const link= document.getElementById("downloadLink");
  link.href= url;

}

function syncLogHeight() {
  const graphPanel = document.querySelector(".graph-panel");
  const logPanel = document.querySelector(".log-panel");

  if (!graphPanel || !logPanel) return;

  const height = graphPanel.scrollHeight;
  logPanel.style.height = height-50 + "px";
}

function download() {
  if(!incoming_data.length){
    return;
  }
  let csv= "Time, Piezo, Ax, Ay, Az\n";
  incoming_data.forEach(row =>{
    csv+= `${row.time}, ${row.piezo}, ${row.ax}, ${row.ay}, ${row.az}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.getElementById("downloadLink");
  link.href = url;
  link.download = "incoming_data.csv";
  link.click();
  URL.revokeObjectURL(url);
}


/* CHART OPTIONS – IMPORTANT */
function chartOptions() {
  return {
    responsive: false,
    maintainAspectRatio: false,
    animation: false,

    interaction: {
      mode: 'nearest',
      intersect: false
    },

    plugins: {
      tooltip: {
        enabled: true,
        backgroundColor: '#111',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#444',
        borderWidth: 1,
        displayColors: false
      },
      legend: {
        display: false,
        labels: {
          color: "#e5e7eb",
          font: { size: 14, weight: 'bold' }
        }
      }
    },

    scales: {
      x: {
        ticks: {
          color: "#e5e7eb",
          font: { size: 12 },
          maxRotation: 0
        },
        grid: { color: "#333" }
      },
      y: {
        display: false,
        ticks: {
          color: "#e5e7eb",
          font: { size: 12 }
        },
        grid: { color: "#333" }
      }
    }
  };
}

function yAxisOptions() {
  return {
    responsive: false,
    animation: false,
    plugins: { 
      legend: { display: false },
      tooltip:{ enabled: false }
    },

    elements: {
      line: {borderWidth: 0},
      point: {width: 0}
    },

    scales: {
      x: { display: false },
      y: {
        ticks: { 
          color: "#e5e7eb", 
          padding: 8
        },
        grid: { 
          color: "#333" 
        },
        beginAtZero: false
      }
    }
  };
}


/* CREATE CHART – FIXED RESOLUTION */
function createChart(id, label, color) {
  const main = document.getElementById(id);
  const Yaxis= document.getElementById("y" +id);

  main.width = 3000;
  main.height = 260;

  Yaxis.width= 90;
  Yaxis.height= 260;

  const Main= main.getContext("2d");
  const Y = Yaxis.getContext("2d");

  const yChart= new Chart( Y, {
    type: "line",
    data: { labels: [], datasets: []},
    options: yAxisOptions()
  })

  const mainChart= new Chart(Main, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label,
        data: [],
        borderColor: color,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHitRadius: 10,
        showLine: true,
        tension: 0
      }]
    },
    options: chartOptions()
  });

  return{mainChart, yChart};
}

/* CONNECT MQTT */
function connectMQTT() {
  const url = `wss://${host}:${port}/mqtt`;
  client = mqtt.connect(url, { username, password });

  client.on("connect", () => {
    isConnected = true;
    document.getElementById("status").textContent = "Connected";
    client.subscribe(topic);
  });

  client.on("message", (_, msg) => {
    if (!isReceiving) return;

    const time = new Date().toLocaleString("sv-SE");
    console.log(time);

    const d = JSON.parse(msg.toString());

    incoming_data.push({
      time, piezo: d.piezo, ax: d.ax, ay: d.ay, az: d.az
    });

    document.getElementById("log").innerHTML +=
      `<div>[${time}] Piezo:${d.piezo} | AX:${d.ax} | AY:${d.ay} | AZ:${d.az}</div>`;

    if (showFCG) pushData(fcgChart, time, d.piezo);
    if (showSCG) {
      pushData(scgAxChart, time, d.ax);
      pushData(scgAyChart, time, d.ay);
      pushData(scgAzChart, time, d.az);
    }
    if (showPCG) pushData(pcgChart, time, d.piezo);
  });
}

/* START / STOP */
startBtn.onclick = () => {
  if (!isConnected) return alert("MQTT not connected");

  isReceiving = true;
  graphControls.classList.remove("hidden");

  if (!fcgChart) fcgChart = createChart("chart1", "FCG", "#39e9a3ff");
  if (!scgAxChart) scgAxChart = createChart("chart2", "SCG AX", "#9feb25ff");
  if (!scgAyChart) scgAyChart = createChart("chart3", "SCG AY", "#03f72cff");
  if (!scgAzChart) scgAzChart = createChart("chart4", "SCG AZ", "#63bc24ff");
  if (!pcgChart) pcgChart = createChart("chart5", "PCG", "#87bb9fff");
  setTimeout(syncLogHeight, 50);
};

stopBtn.onclick = () => isReceiving = false;

/* TOGGLE GRAPHS */
g1.onclick = () => {
  showFCG = !showFCG;
  fcg.classList.toggle("hidden", !showFCG);
  setTimeout(syncLogHeight, 50);
};

g2.onclick = () => {
  showSCG = !showSCG;
  scgAx.classList.toggle("hidden", !showSCG);
  scgAy.classList.toggle("hidden", !showSCG);
  scgAz.classList.toggle("hidden", !showSCG);
  setTimeout(syncLogHeight, 50);
};

g3.onclick = () => {
  showPCG = !showPCG;
  pcg.classList.toggle("hidden", !showPCG);
  setTimeout(syncLogHeight, 50);
};

/* PUSH DATA */
function pushData(chart, label, value) {
  chart.mainChart.data.labels.push(label);
  chart.mainChart.data.datasets[0].data.push(value);
  chart.mainChart.update("none");

  const yScale = chart.mainChart.scales.y;
  chart.yChart.options.scales.y.min = yScale.min;
  chart.yChart.options.scales.y.max = yScale.max;
  chart.yChart.update("none");
}


