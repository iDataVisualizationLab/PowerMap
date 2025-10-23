//parametter
const COMPUTE = 'nodes_info';
const JOB = 'jobs_info';
const JOBNAME = 'job_name';
const USER = 'user_name';
let mode = 'historical'; // 'realTime' or 'historical'
const timeFormat = d3.timeFormat('%Y-%m-%dT%H:%M:%S-06:00');
let sampleMinTime = null;
let sampleMaxTime = null;
// layout
let Layout = {
    data: {},
}
const NODE_RANGES = [
  '10.101.91.[1-20]',
  '10.101.92.[1-20]',
  '10.101.94.[1-20]',
  '10.101.95.[1-10]',
  '10.101.96.[1-20]',
  '10.101.97.[1-20]',
];
let serviceSelected = 0;

// let request = new Simulation('../HiperView/data/742020.json');
let request, timelineControl;


// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const TIME_RANGES = [
  { label: 'Power off', value: -4 , default: false },
  { label: 'High Room Temperature', value: -3 , default: true },
  { label: 'Specific time', value: -1 , default: false },
  { label: 'This week', value: 7 , default: false },
  { label: '3 days', value: 3 , default: false },
  { label: 'Today', value: 1 , default: false },
  { label: 'Current time', value: -2 , default: false }
];

const INTERVALS = {
  [-2]: [
    { label: '1m', value: 60000 , default: true},
    { label: '5m', value: 5 * 60000 , default: false},
  ],
  [1]: [
    { label: '5m', value: 5 * 60000 , default: false},
    { label: '10m', value: 10 * 60000, default: true },
    { label: '30m', value: 30 * 60000 , default: false},
    { label: '60m', value: 60 * 60000 , default: false},
  ],
  [3]: [
    { label: '5m', value: 5 * 60000 , default: false},
    { label: '10m', value: 10 * 60000 , default: false},
    { label: '30m', value: 30 * 60000, default: true },
    { label: '60m', value: 60 * 60000 , default: false},
  ],
  [7]: [
    { label: '10m', value: 10 * 60000 , default: false},
    { label: '30m', value: 30 * 60000 , default: false},
    { label: '60m', value: 60 * 60000, default: true },
  ]
};


////////////////////////////////////////////////////////////////////////////////////////////
// Keep the canonical base data (from combined2) here
let baseData = null;

// Cache for per-metric JSONs (avoid refetching)
const metricCache = new Map();

let METRIC_DIRS = [];



// use the same filename sanitizing as in the Python exporter
function metricFileName(name) {
  return name.replace(/[ ./\\]/g, '_') + '.json';
}
function guessUnit(oneTs) {
  // heuristic: seconds ~ 1e9, ms ~ 1e12, ns ~ 1e15
  const v = Math.abs(+oneTs || 0);
  if (v >= 1e14) return 'ns';
  if (v >= 1e11) return 'ms';
  return 's';
}
function convertBetween(from, to, t) {
  if (from === to) return t;
  if (from === 's' && to === 'ms') return t * 1e3;
  if (from === 's' && to === 'ns') return t * 1e9;
  if (from === 'ms' && to === 's') return Math.floor(t / 1e3);
  if (from === 'ms' && to === 'ns') return t * 1e6;
  if (from === 'ns' && to === 'ms') return Math.floor(t / 1e6);
  if (from === 'ns' && to === 's') return Math.floor(t / 1e9);
  return t;
}
function applyServiceListForRange(rangeVal) {
  const v = Number(rangeVal); // normalize to number

  if (v === -3) {
    serviceListattr = [
      "system_power", "cpu_power", "temperature", "cpu_usage", "memory_usage",
      "ampsreading", "availablespare", "availablesparethreshold", "compositetemperature",
      "computepower", "controllerbusytimelower", "cpupower", "cpuusage", "cpuusagepctreading",
      "dataunitsreadlower", "dataunitswrittenlower", "hostreadcommandslower", "hostwritecommandslower",
      "itue", "powercycleslower", "poweronhourslower", "powertocoolratio", "psuefficiency",
      "psurpmreading", "psutemperaturereading", "rpmreading", "sysairflowefficiency",
      "sysairflowperfanpower", "sysairflowpersysinputpower", "sysairflowutilization",
      "sysnetairflow", "sysracktempdelta", "systemheadroominstantaneous", "systeminputpower",
      "systemoutputpower", "systempowerconsumption", "temperaturereading", "totalcpupower",
      "totalfanpower", "totalmemorypower", "totalpsuheatdissipation", "totalstoragepower",
      "unsafeshutdownslower", "voltagereading", "wattsreading"
    ];
  } else if (v === -4) {
    serviceListattr = [
      "system_power", "cpu_power", "temperature", "cpu_usage", "memory_usage",
    ];
    // serviceListattr = [
    //   "system_power", "cpu_power", "temperature", "cpu_usage", "memory_usage",
    //   "aggregateusage", "ampsreading", "availablespare", "availablesparethreshold",
    //   "avgfrequencyacrosscores", "compositetemperature", "computepower",
    //   "controllerbusytimelower", "cpuavgpbmratiocounterlow", "cpuc0residencyhigh",
    //   "cpuc0residencylow", "cpuepi", "cpulimitingcounter", "cpupkgenergy",
    //   "cpupower", "cpuusage", "cpuusagepctreading", "cpuviolationcounter",
    //   "dataunitsreadlower", "dataunitswrittenlower", "ddrlimitingcounter",
    //   "drampkgenergy", "drampwr", "dramthrottling", "drivetemperature",
    //   "eccerate", "energytimestamp", "gpuarbitratedpowerlimit", "gpuclockfrequency",
    //   "gpumemoryclockfrequency", "gpumemoryusage", "gpuusage", "hostreadcommandslower",
    //   "hostwritecommandslower", "iousage", "iousagepctreading", "itue", "limitingevents",
    //   "mediawritecount", "memorytemperature", "memoryusage", "memoryusagepctreading",
    //   "percentdriveliferemaining", "pkgpwr", "pkgthermalstatus", "powerconsumption",
    //   "powercyclecount", "powercycleslower", "poweronhours", "poweronhourslower",
    //   "powertocoolratio", "primarytemperature", "psuefficiency", "psurpmreading",
    //   "psutemperaturereading", "readerrorrate", "rpmreading", "sysairflowefficiency",
    //   "sysairflowperfanpower", "sysairflowpersysinputpower", "sysairflowutilization",
    //   "sysnetairflow", "sysracktempdelta", "systemheadroominstantaneous",
    //   "systeminputpower", "systemoutputpower", "systempowerconsumption",
    //   "systemusagepctreading", "tctrl", "temperaturereading", "tjmax", "totalcpupower",
    //   "totalfanpower", "totalmemorypower", "totalpsuheatdissipation", "totalstoragepower",
    //   "unsafeshutdownslower", "unusedreservedblockcount", "usedreservedblockcount",
    //   "voltagereading", "wattsreading"
    // ];
  } else {
    // default (small) list
    serviceListattr = ["system_power", "cpu_power", "temperature", "cpu_usage"];
  }

  // Rebuild dependent structures and refresh the UI
  serviceLists = serviceListattr.map((key, index) => ({
    text: key,
    id: index,
    enable: true,
    sub: [{
      text: key,
      id: 0,
      enable: true,
      idroot: index,
      angle: (2 * Math.PI * index) / serviceListattr.length,
      range: [0, 3000],
    }]
  }));

  serviceFullList = [];
  serviceLists.forEach(s => s.sub.forEach(ss => serviceFullList.push(ss)));

  serviceList_selected = serviceListattr.map((key, i) => ({ text: key, index: i }));
  alternative_service = [...serviceListattr];
  alternative_scale = Array(serviceListattr.length).fill(1);

  serviceControl();        // re-render dropdowns/controls
  // if (baseData) updateServiceRanges(baseData); // optional: recompute ranges if data loaded
}

////////////////////////////////////////////////////////////////////////////////////////////
function renderModeMenu() {
  const container = d3.select('#timeSetting');
  container.selectAll('*').remove();


  container.append('div')
    .attr('class', 'col-6 mb-3')
    .html(`
      <label>Time Range</label>
      <select class="form-control" id="realTimeRange">
        ${TIME_RANGES.map(opt => `<option value="${opt.value}"${opt.default ? ' selected' : ''}>${opt.label}</option>`).join('')}
      </select>
    `);

  const intervalContainer = container.append('div')
    .attr('class', 'col-6 mb-3')
    .attr('id', 'intervalContainer')
    .html(`
      <label>Interval</label>
      <select class="form-control" id="realTimeInterval"></select>
    `);

  const startEndContainer = container.append('div')
    .attr('class', 'col-12 row')
    .attr('id', 'startEndContainer')
    .style('display', 'none');

  startEndContainer.append('div')
    .attr('class', 'col-6 mb-3')
    .html(`
      <label>Start Time</label>
      <input type="datetime-local" class="form-control" id="startTime" value="2025-06-15T12:00">
    `);

  startEndContainer.append('div')
    .attr('class', 'col-6 mb-3')
    .html(`
      <label>End Time</label>
      <input type="datetime-local" class="form-control" id="endTime" value="2025-06-15T14:00">
    `);

  const processBtnContainer = startEndContainer.append('div')
    .attr('class', 'col-12 mb-3 d-flex justify-content-end')
    .html(`
      <button id="processBtn" class="btn btn-primary">Process</button>
    `);

  // Hide process button initially
  d3.select('#processBtn').style('display', 'none');

  // Bind action to process button
  // d3.select('#processBtn').on('click', loadHistoricalData);
  d3.select('#processBtn').on('click', loadHistoricalAcrossRanges);

  // Handle time range changes
  d3.select('#realTimeRange')
    .on('change', function () {
        const selected = +this.value;
        const intervalSelect = d3.select('#realTimeInterval');
        const intervalBox = d3.select('#intervalContainer');
        const startEndBox = d3.select('#startEndContainer');
        const processBtn = d3.select('#processBtn');
        applyServiceListForRange(selected);
        if (selected === -1) {
          intervalBox.style('display', 'none');
          startEndBox.style('display', null);
          processBtn.style('display', null);
        } else if (selected <= -3) {
          intervalBox.style('display', 'none');
          startEndBox.style('display', null);
          processBtn.style('display', null);
          loadSampleData()
        } else {
          intervalBox.style('display', null); // show interval
          startEndBox.style('display', 'none'); // hide time inputs
          processBtn.style('display', 'none'); // hide button

        // Update interval options
        const intervalOptions = INTERVALS[selected] || [];
        intervalSelect.selectAll('option').remove();
        intervalOptions.forEach(opt => {
          intervalSelect.append('option')
            .attr('value', opt.value)
            .text(opt.label)
            .property('selected', !!opt.default);
        });

        startRealTimePolling(); // trigger reload on range change
      }
    })
    .dispatch('change'); // trigger once on load

  d3.select('#realTimeInterval').on('change', startRealTimePolling);


}

function buildRealTimeParams(rangeValue, intervalValue) {
    const now = new Date();
  const durationMs = rangeValue < 0
    ? Math.abs(rangeValue) * 60 * 60 * 1000  // hours
    : rangeValue * 24 * 60 * 60 * 1000;      // days
  const start = new Date(now - durationMs);
  const format = d3.timeFormat("%Y-%m-%d %H:%M:%S%Z");
  const formatInterval = intervalValue < 60000 ? (intervalValue / 1000) + 's' : (intervalValue / 60000) + 'm';
  return {
    start: format(start),
    end: format(now),
    interval: formatInterval,
    aggregation: "max",
    nodelist: "10.101.93.[1-8]",
    metrics: [
      "GPU_Usage", "GPU_PowerConsumption", "GPU_MemoryUsage", "GPU_Temperature",
      "CPU_Usage", "CPU_PowerConsumption", "CPU_Temperature",
      "DRAM_Usage", "DRAM_PowerConsumption",
      "System_PowerConsumption", "Jobs_Info", "NodeJobs_Correlation", "Nodes_State"
    ],
    compression: false
  };
}
function combineResults(resultsArray) {
  const combined = {
    time_stamp: [],
    nodes_info: {},
    jobs_info: {}
  };
  console.log('Combining results:', resultsArray.length, 'results');
  console.log(resultsArray);

  for (const result of resultsArray) {
    // Merge time stamps
    combined.time_stamp.push(...(result.time_stamp ?? []));

    // Merge nodes_info
    for (const [node, info] of Object.entries(result.nodes_info)) {
      if (!combined.nodes_info[node]) {
        combined.nodes_info[node] = info;
      }
    }

    // Merge jobs_info
    for (const [jid, job] of Object.entries(result.jobs_info)) {
      if (!combined.jobs_info[jid]) {
        combined.jobs_info[jid] = job;
      }
    }
  }

  // Remove duplicate time_stamps and sort
  combined.time_stamp = Array.from(new Set(combined.time_stamp)).sort((a, b) => a - b);

  return combined;
}

async function fetchAllNodeRanges(startStr, endStr, isRealTime = false) {
  const allResults = [];

  for (const range of NODE_RANGES) {
    // const nodes = expandBrackets(range);
    const params = {
      ...(isRealTime
        ? buildRealTimeParams(Date.now() - 1 * 60 * 60 * 1000, Date.now()) // if needed
        : buildHistoricalParams(startStr, endStr)),
      nodelist: range,
    };

    const result = await fetchDataAndProcess(params, true);
    allResults.push(result);
  }

  return combineResults(allResults);
}

function buildHistoricalParams(startStr, endStr) {
  const parse = d3.timeParse('%Y-%m-%dT%H:%M');
  const format = d3.timeFormat('%Y-%m-%d %H:%M:%S%Z');
  const start = parse(startStr);
  const end = parse(endStr);
  const durationMs = end - start;
  let interval;
  if (durationMs <= 6 * 60 * 60 * 1000) interval = '5m';
  else if (durationMs <= 24 * 60 * 60 * 1000) interval = '10m';
  else if (durationMs <= 3 * 24 * 60 * 60 * 1000) interval = '30m';
  else interval = '60m';
  return {
    start: format(start),
    end: format(end),
    interval: interval,
    aggregation: "max",
    nodelist: "10.101.91.[1-20]",
    metrics: [
    "CPU_Usage",
    "CPU_PowerConsumption",
    "CPU_Temperature",
    "DRAM_Usage",
    "DRAM_PowerConsumption",
    "System_PowerConsumption",
    "Jobs_Info",
    "NodeJobs_Correlation",
    "Nodes_State"
    ],
    compression: false
  };
}

function fetchDataAndProcess_old(Params) {
  return fetch('http://narumuu.ttu.edu/api/zen4/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Params)
    }).then(res => res.json()).then(apiData => {
        console.log('API Data:', apiData);
        const timeMap = new Map();
        const allTimes = Array.from(new Set(apiData.nodes.map(d => d.time))).sort((a, b) => a - b);
        allTimes.forEach((t, i) => timeMap.set(t, i));

        const nodes_info = {};
        const jobs_info = {};

        apiData.nodes.forEach(entry => {
            const node = entry.node;
            const idx = timeMap.get(entry.time);
            if (!nodes_info[node]) {
                const len = allTimes.length;
                nodes_info[node] = {
                    cpus: Array(len).fill().map(() => []),
                    job_id: Array(len).fill().map(() => []),
                    system_power: Array(len).fill().map(() => []),
                    gpu_power: Array(len).fill().map(() => []),
                    cpu_power: Array(len).fill().map(() => []),
                    gpu_mem: Array(len).fill().map(() => []),
                    gpu_usage: Array(len).fill().map(() => []),
                    cpu_usage: Array(len).fill().map(() => []),
                    dram_usage: Array(len).fill().map(() => []),
                    dram_power: Array(len).fill().map(() => []),
                    user: [],
                    jobName: []
                };
            }

            nodes_info[node].cpus[idx] = entry.cores ?? [];
            nodes_info[node].job_id[idx] = entry.jobs ?? [];
            nodes_info[node].system_power[idx] = entry.system_power_consumption ?? [];
            nodes_info[node].gpu_power[idx] = (entry.gpu_power_consumption ?? []).map(v => v / 1000);
            nodes_info[node].cpu_power[idx] = entry.cpu_power_consumption ?? [];
            nodes_info[node].gpu_mem[idx] = entry.gpu_memory_usage ?? [];
            nodes_info[node].gpu_usage[idx] = entry.gpu_usage ?? [];
            nodes_info[node].cpu_usage[idx] = entry.cpu_usage ?? [];
            nodes_info[node].dram_usage[idx] = entry.dram_usage ?? [];
nodes_info[node].dram_power[idx] = (entry.dram_power_consumption ?? []).map(v => v / 1000);
        });

        apiData.job_details.forEach(job => {
            jobs_info[job.job_id] = {
                job_id: job.job_id,
                job_name: job.name,
                user_name: job.user_name,
                user_id: job.user_id,
                submit_time: job.submit_time * 1e9,
                start_time: job.start_time * 1e9,
                end_time: job.end_time * 1e9,
                node_list: job.nodes ?? [],
                cpu_cores: job.cpus,
                array_task_id: job.array_task_id,
                array_job_id: job.array_job_id
            };
            for (const node of job.nodes ?? []) {
                if (nodes_info[node]) {
                    if (!nodes_info[node].user.includes(job.user_name)) {
                        nodes_info[node].user.push(job.user_name);
                    }
                    if (!nodes_info[node].jobName.includes(job.name)) {
                        nodes_info[node].jobName.push(job.name);
                    }
                }
            }
        });

        const jobObjArr = {};
        Object.values(jobs_info).forEach(d => {
            if (d.array_task_id != null && d.array_job_id != null) {
                const arrayId = 'array' + d.array_job_id;
                if (!jobObjArr[arrayId]) {
                    jobObjArr[arrayId] = {
                        isJobarray: true,
                        job_id: arrayId,
                        job_ids: {},
                        finish_time: null,
                        job_name: d.job_name,
                        node_list: [],
                        node_list_obj: {},
                        total_nodes: 0,
                        user_name: d.user_name,
                        user_id: d.user_id,
                        start_time: d.start_time,
                        submit_time: d.submit_time
                    };
                }
                jobObjArr[arrayId].job_ids[d.job_id] = d;
                jobObjArr[arrayId].start_time = Math.min(jobObjArr[arrayId].start_time, d.start_time);
                jobObjArr[arrayId].submit_time = Math.min(jobObjArr[arrayId].submit_time, d.submit_time);
            }
        });
        Object.entries(jobObjArr).forEach(([id, job]) => jobs_info[id] = job);

        const final_jobs_info = {};
        Object.entries(nodes_info).forEach(([comp, d]) => {
            d.job_id.forEach((jobList, ti) => {
                jobList.forEach((jid, i) => {
                    if (!final_jobs_info[jid]) {
                        final_jobs_info[jid] = jobs_info[jid] ?? {
                            job_id: jid,
                            cpu_cores: d.cpus[ti]?.[i],
                            finish_time: null,
                            job_name: '' + jid,
                            node_list: [],
                            node_list_obj: {},
                            start_time: allTimes[ti] * 1e9,
                            submit_time: allTimes[ti] * 1e9,
                            total_nodes: 0,
                            user_name: "unknown",
                            user_id: -1
                        };
                        final_jobs_info[jid].node_list_obj = {};
                        final_jobs_info[jid].node_list = [];
                        final_jobs_info[jid].total_nodes = 0;
                    }

                    const arrayId = final_jobs_info[jid].job_array_id;
                    if (arrayId && !final_jobs_info[arrayId]) {
                        final_jobs_info[arrayId] = jobs_info[arrayId];
                        final_jobs_info[arrayId].node_list_obj = {};
                        final_jobs_info[arrayId].node_list = [];
                        final_jobs_info[arrayId].total_nodes = 0;
                    }

                    if (!final_jobs_info[jid].node_list_obj[comp]) {
                        final_jobs_info[jid].node_list_obj[comp] = d.cpus[ti]?.[i] ?? 0;
                        final_jobs_info[jid].node_list.push(comp);
                        final_jobs_info[jid].total_nodes++;
                    }

                    final_jobs_info[jid].finish_time = allTimes[ti] * 1e9;

                    if (arrayId) {
                        if (!final_jobs_info[arrayId].node_list_obj[comp]) {
                            final_jobs_info[arrayId].node_list_obj[comp] = d.cpus[ti]?.[i] ?? 0;
                            final_jobs_info[arrayId].node_list.push(comp);
                            final_jobs_info[arrayId].total_nodes++;
                        }
                        final_jobs_info[arrayId].finish_time = allTimes[ti] * 1e9;
                    }
                });
            });
        });

        return {
            time_stamp: allTimes.map(t => t * 1e9),
            nodes_info,
            jobs_info: final_jobs_info
        };
    })
}



function toNs(arr){ if(!arr?.length) return []; const u=guessUnit(arr[0]); return arr.map(t=>convertBetween(u,'ns',+t)); }
function medianStep(ns){
  const d=[]; for (let i=1;i<ns.length;i++){ const x=ns[i]-ns[i-1]; if(x>0&&Number.isFinite(x)) d.push(x); }
  d.sort((a,b)=>a-b); return d.length ? d[Math.floor(d.length/2)] : 1;
}
function buildNearestIndex(baseNs, metricNs, tol){
  const idx = new Array(baseNs.length).fill(-1);
  if (!metricNs.length) return idx;
  let j = 0;
  for (let i=0;i<baseNs.length;i++){
    const t = baseNs[i];
    while (j+1<metricNs.length && Math.abs(metricNs[j+1]-t) <= Math.abs(metricNs[j]-t)) j++;
    if (Math.abs(metricNs[j]-t) <= tol) idx[i] = j;
  }
  return idx;
}

async function addMetricFromFile(base, metricName){
  const metricJson = await fetchMetricJSON(metricName); // your existing loader
  const baseNs = base.time_stamp;                         // ns
  const mTimes = toNs(metricJson.time_stamp || []);       // normalize
  const tol    = Math.max(1, medianStep(baseNs)/2);
  const mapIdx = buildNearestIndex(baseNs, mTimes, tol);

  for (const node of Object.keys(metricJson.nodes_info || {})){
    const srcNode = metricJson.nodes_info[node];
    const srcArr  = srcNode?.[metricName];
    if (!Array.isArray(srcArr)) continue;

    // time-aligned destination
    const dest = Array(baseNs.length).fill(0).map(()=>[]);
    for (let i=0;i<mapIdx.length;i++){
      const j = mapIdx[i];
      if (j>=0 && srcArr[j]!=null){
        const v = srcArr[j];
        dest[i] = Array.isArray(v) ? v : [v];   // keep as array so .flat() logic still works
      }
    }

    if (!base.nodes_info[node]){
      const blank = Array(baseNs.length).fill(0).map(()=>[]);
      base.nodes_info[node] = { cpus: blank.slice(), job_id: blank.slice() };
    }
    base.nodes_info[node][metricName] = dest;
  }
}

async function preloadAllMetricsWithData(base, {maxParallel=4, minFill=0.001} = {}){
  const names = await getAvailableMetrics([]); // your CSV-based discovery

  // quick test to skip metrics that are effectively empty
  async function hasAnyData(name){
    try{
      const j = await fetchMetricJSON(name);
      for (const node of Object.keys(j.nodes_info || {})){
        const arr = j.nodes_info[node]?.[name];
        if (Array.isArray(arr) && arr.some(x => Array.isArray(x) ? x.length : (x != null))) {
          return true;
        }
      }
    }catch(e){}
    return false;
  }

  const queue = [];
  for (const m of names) if (await hasAnyData(m)) queue.push(m);

  const loaded = [];
  async function worker(){
    while(queue.length){
      const name = queue.shift();
      try{
        await addMetricFromFile(base, name);
        loaded.push(name);
      }catch(e){
        console.warn('Skip metric', name, e);
      }
    }
  }
  await Promise.all(Array.from({length: Math.min(maxParallel, queue.length)}, worker));
  return loaded;
}


async function fetchDataAndProcess(Params, isRealTime = true) {
  let apiData;

  if (isRealTime) {
    // Real-time: Fetch from API
    apiData = await fetch('http://narumuu.ttu.edu/api/zen4/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Params)
    }).then(res => res.json());
  } else {
    if (document.getElementById('realTimeRange').value == -3) {
      apiData = await fetch('src/data/combined.json')
        .then(res => res.json());
    }
    if (document.getElementById('realTimeRange').value == -4) {
      apiData = await fetch('src/data/combined_october_cleaned.json')
        .then(res => res.json());
    }
  }

  const timeMap = new Map();
        const allTimes = Array.from(new Set(apiData.nodes.map(d => d.time))).sort((a, b) => a - b);
        allTimes.forEach((t, i) => timeMap.set(t, i));

        const nodes_info = {};
        const jobs_info = {};

        apiData.nodes.forEach(entry => {
            const node = entry.node;
            const idx = timeMap.get(entry.time);
            if (!nodes_info[node]) {
                const len = allTimes.length;
                nodes_info[node] = {
                    cpus: Array(len).fill().map(() => []),
                    job_id: Array(len).fill().map(() => []),
                    system_power: Array(len).fill().map(() => []),
                    // gpu_power: Array(len).fill().map(() => []),
                    cpu_power: Array(len).fill().map(() => []),
                    // gpu_mem: Array(len).fill().map(() => []),
                    // gpu_usage: Array(len).fill().map(() => []),
                    memory_usage: Array(len).fill().map(() => []),
                    temperature: Array(len).fill().map(() => []),
                    fans: Array(len).fill().map(() => []),
                    cpu_usage: Array(len).fill().map(() => []),
                    dram_usage: Array(len).fill().map(() => []),
                    dram_power: Array(len).fill().map(() => []),
                    user: [],
                    jobName: []
                };
            }
            nodes_info[node].cpus[idx] = entry.cores ?? [];
            nodes_info[node].job_id[idx] = entry.jobs ?? [];
            nodes_info[node].system_power[idx] = entry.system_power_consumption ?? [];
            // nodes_info[node].gpu_power[idx] = (entry.gpu_power_consumption ?? []).map(v => v / 1000);
            nodes_info[node].cpu_power[idx] = entry.cpu_power_consumption ?? [];
            // nodes_info[node].gpu_mem[idx] = entry.gpu_memory_usage ?? [];
            // nodes_info[node].gpu_usage[idx] = entry.gpu_usage ?? [];
            nodes_info[node].memory_usage[idx] = entry.memory_usage ?? [];
            nodes_info[node].temperature[idx] = entry.temperature ?? [];
            nodes_info[node].fans[idx] = entry.fans ?? [];
            nodes_info[node].cpu_usage[idx] = entry.cpu_usage ?? [];
            nodes_info[node].dram_usage[idx] = entry.dram_usage ?? [];
            nodes_info[node].dram_power[idx] = (entry.dram_power_consumption ?? []).map(v => v / 1000);
        });

        apiData.job_details.forEach(job => {
            jobs_info[job.job_id] = {
                job_id: job.job_id,
                job_name: job.name,
                user_name: job.user_name,
                user_id: job.user_id,
                submit_time: job.submit_time * 1e9,
                start_time: job.start_time * 1e9,
                end_time: job.end_time * 1e9,
                node_list: job.nodes ?? [],
                cpu_cores: job.cpus,
                array_task_id: job.array_task_id,
                array_job_id: job.array_job_id
            };
            for (const node of job.nodes ?? []) {
                if (nodes_info[node]) {
                    if (!nodes_info[node].user.includes(job.user_name)) {
                        nodes_info[node].user.push(job.user_name);
                    }
                    if (!nodes_info[node].jobName.includes(job.name)) {
                        nodes_info[node].jobName.push(job.name);
                    }
                }
            }
        });

        const jobObjArr = {};
        Object.values(jobs_info).forEach(d => {
            if (d.array_task_id != null && d.array_job_id != null) {
                const arrayId = 'array' + d.array_job_id;
                if (!jobObjArr[arrayId]) {
                    jobObjArr[arrayId] = {
                        isJobarray: true,
                        job_id: arrayId,
                        job_ids: {},
                        finish_time: null,
                        job_name: d.job_name,
                        node_list: [],
                        node_list_obj: {},
                        total_nodes: 0,
                        user_name: d.user_name,
                        user_id: d.user_id,
                        start_time: d.start_time,
                        submit_time: d.submit_time
                    };
                }
                jobObjArr[arrayId].job_ids[d.job_id] = d;
                jobObjArr[arrayId].start_time = Math.min(jobObjArr[arrayId].start_time, d.start_time);
                jobObjArr[arrayId].submit_time = Math.min(jobObjArr[arrayId].submit_time, d.submit_time);
            }
        });
        Object.entries(jobObjArr).forEach(([id, job]) => jobs_info[id] = job);

        const final_jobs_info = {};
        Object.entries(nodes_info).forEach(([comp, d]) => {
            d.job_id.forEach((jobList, ti) => {
                jobList.forEach((jid, i) => {
                    if (!final_jobs_info[jid]) {
                        final_jobs_info[jid] = jobs_info[jid] ?? {
                            job_id: jid,
                            cpu_cores: d.cpus[ti]?.[i],
                            finish_time: null,
                            job_name: '' + jid,
                            node_list: [],
                            node_list_obj: {},
                            start_time: allTimes[ti] * 1e9,
                            submit_time: allTimes[ti] * 1e9,
                            total_nodes: 0,
                            user_name: "unknown",
                            user_id: -1
                        };
                        final_jobs_info[jid].node_list_obj = {};
                        final_jobs_info[jid].node_list = [];
                        final_jobs_info[jid].total_nodes = 0;
                    }

                    const arrayId = final_jobs_info[jid].job_array_id;
                    if (arrayId && !final_jobs_info[arrayId]) {
                        final_jobs_info[arrayId] = jobs_info[arrayId];
                        final_jobs_info[arrayId].node_list_obj = {};
                        final_jobs_info[arrayId].node_list = [];
                        final_jobs_info[arrayId].total_nodes = 0;
                    }

                    if (!final_jobs_info[jid].node_list_obj[comp]) {
                        final_jobs_info[jid].node_list_obj[comp] = d.cpus[ti]?.[i] ?? 0;
                        final_jobs_info[jid].node_list.push(comp);
                        final_jobs_info[jid].total_nodes++;
                    }

                    final_jobs_info[jid].finish_time = allTimes[ti] * 1e9;

                    if (arrayId) {
                        if (!final_jobs_info[arrayId].node_list_obj[comp]) {
                            final_jobs_info[arrayId].node_list_obj[comp] = d.cpus[ti]?.[i] ?? 0;
                            final_jobs_info[arrayId].node_list.push(comp);
                            final_jobs_info[arrayId].total_nodes++;
                        }
                        final_jobs_info[arrayId].finish_time = allTimes[ti] * 1e9;
                    }
                });
            });
        });

        // return {
        //     time_stamp: allTimes.map(t => t * 1e9),
        //     nodes_info,
        //     jobs_info: final_jobs_info
        // };
        const baseObj = {
  time_stamp: allTimes.map(t => t * 1e9),
  nodes_info,
  jobs_info: final_jobs_info
};

// Preload ALL metrics that actually have data (with a small concurrency cap)
await preloadAllMetricsWithData(baseObj, { maxParallel: 3 });
console.log(baseObj)
// Now return the fully-populated object
return baseObj;
}
let realTimeIntervalId;
function startRealTimePolling(isRealTime = true) {
  const range = +document.getElementById('realTimeRange').value;
  const intervalMs = +document.getElementById('realTimeInterval').value;
  if (realTimeIntervalId) clearInterval(realTimeIntervalId);
  function fetchAndUpdate() {
    const realTimeParams = buildRealTimeParams(range, intervalMs);
    request = new Simulation(fetchDataAndProcess(realTimeParams, isRealTime));
  }

  fetchAndUpdate();
  initdraw();
    initTimeElement();
  realTimeIntervalId = setInterval(fetchAndUpdate, intervalMs);
}

//////////////////////////////////////////////////////////////////////////////////////////
// async function fetchMetricJSON(metricName) {
//   if (metricCache.has(metricName)) return metricCache.get(metricName);
//   const file = metricFileName(metricName);
//   for (const dir of METRIC_DIRS) {
//     try {
//       const res = await fetch(`${dir}/${file}`, { cache: 'no-store' });
//       if (res.ok) {
//         const json = await res.json();
//         metricCache.set(metricName, json);
//         return json;
//       }
//     } catch (e) { /* try next folder */ }
//   }
//   throw new Error(`Metric JSON not found: ${file}`);
// }
async function fetchMetricJSON(metricName) {
  if (metricCache.has(metricName)) return metricCache.get(metricName);

  const file = metricFileName(metricName);
  const rangeVal = Number(document.getElementById('realTimeRange')?.value ?? -3);
  METRIC_DIRS = (rangeVal === -4)
    ? [
        'src/data/metrics_output_october/h100/with_data',
        'src/data/metrics_output_october/zen4/with_data',
      ]
    : [
        'src/data/metrics_output/with_data',
        'src/data/metrics_output/no_data',
      ];

  const found = [];
  for (const dir of METRIC_DIRS) {
    try {
      const res = await fetch(`${dir}/${file}`, { cache: 'no-store' });
      if (res.ok) found.push(await res.json());
    } catch (_) {}
  }
  if (!found.length) throw new Error(`Metric JSON not found: ${file}`);

  // Choose the part with the longest time_stamp as the primary
  const byLen = (j) => Array.isArray(j?.time_stamp) ? j.time_stamp.length : 0;
  found.sort((a, b) => byLen(b) - byLen(a));
  const primary = found[0];

  // Start with primary "raw" shape
  const out = {
    time_stamp: Array.isArray(primary.time_stamp) ? primary.time_stamp.slice() : [],
    nodes_info: {},
    jobs_info: primary.jobs_info ? { ...primary.jobs_info } : {}, // keep if present
  };

  // Merge other parts by preferring non-empty values per index
  function mergeNodesInfo(target, src) {
    const ni = src?.nodes_info || {};
    for (const node of Object.keys(ni)) {
      const metricsObj = ni[node] || {};
      target[node] = target[node] || {};
      for (const mName of Object.keys(metricsObj)) {
        const arr = metricsObj[mName];
        if (!Array.isArray(arr)) continue;            // skip weird shapes
        const dest = target[node][mName];
        if (!Array.isArray(dest)) {
          // first time we see this metric for this node: clone as-is
          target[node][mName] = arr.slice();
        } else {
          // prefer non-empty values from either source at each index
          const L = Math.max(dest.length, arr.length);
          const merged = new Array(L);
          for (let i = 0; i < L; i++) {
            const a = dest[i];
            const b = arr[i];
            const aEmpty = (Array.isArray(a) ? a.length === 0 : a == null);
            const bEmpty = (Array.isArray(b) ? b.length === 0 : b == null);
            merged[i] = aEmpty && !bEmpty ? b
                      : !aEmpty && bEmpty ? a
                      : !aEmpty && !bEmpty ? (Array.isArray(a) ? a : [a]).concat(Array.isArray(b) ? b : [b])
                      : []; // both empty
          }
          target[node][mName] = merged;
        }
      }
    }
  }

  // primary first
  mergeNodesInfo(out.nodes_info, primary);
  // then any others
  for (let i = 1; i < found.length; i++) {
    mergeNodesInfo(out.nodes_info, found[i]);
    // If a later part has longer time_stamp, keep the longer one (still raw)
    if (byLen(found[i]) > out.time_stamp.length) {
      out.time_stamp = found[i].time_stamp.slice();
    }
    // Merge jobs_info if present
    if (found[i].jobs_info) {
      out.jobs_info ||= {};
      for (const [jid, job] of Object.entries(found[i].jobs_info)) {
        if (!out.jobs_info[jid]) out.jobs_info[jid] = job;
      }
    }
  }

  metricCache.set(metricName, out);
  return out;
}


/** Merge only one metric into a *copy* of baseData, aligned to base time_axis */
// function mergeMetricIntoBase(base, metricJson, metricName) {
//   const result = {
//     ...base,
//     nodes_info: { ...base.nodes_info }
//   };

//   // ---- Make sure both are numbers (not Date objects)
//   const baseTimesRaw = (base.time_stamp || []).map(t => (t instanceof Date ? +t : +t));
//   const metricTimesRaw = (metricJson.time_stamp || []).map(t => +t);

//   // ---- Detect units and convert metric → base unit
//   const baseUnit   = guessUnit(baseTimesRaw[0]);    // 'ns' | 'ms' | 's'
//   const metricUnit = guessUnit(metricTimesRaw[0]);

//   const toUnit = (v, from, to) => {
//     if (from === to) return v;
//     const mul = u => (u === 's' ? 1 : u === 'ms' ? 1e6 : 1e9);
//     return Math.floor(v * (mul(to)/ mul(from)));
//   };

//   const baseTimes   = baseTimesRaw.slice(); // keep in base unit
//   const metricTimes = metricTimesRaw.map(t => toUnit(t, metricUnit, baseUnit));

//   // ---- Build nearest-neighbor index with tolerance (½ base step)
//   const steps = [];
//   for (let i = 1; i < baseTimes.length; i++) {
//     const d = baseTimes[i] - baseTimes[i - 1];
//     if (isFinite(d) && d > 0) steps.push(d);
//   }
//   steps.sort((a, b) => a - b);
//   const baseStep = steps.length ? steps[Math.floor(steps.length / 2)] : Math.max(1, baseTimes[1] - baseTimes[0] || 1);
//   const tol = Math.max(1, baseStep / 2);

//   const idxMap = new Array(baseTimes.length).fill(-1);
//   let i = 0, j = 0;
//   while (i < baseTimes.length && j < metricTimes.length) {
//     const dt = metricTimes[j] - baseTimes[i];
//     if (Math.abs(dt) <= tol) { idxMap[i] = j; i++; j++; }
//     else if (dt < -tol)      { j++; }
//     else                     { i++; }
//   }

//   // ---- Ensure metric nodes exist in result
//   const metricNodes = Object.keys(metricJson.nodes_info || {});
//   for (const node of metricNodes) {
//     if (!result.nodes_info[node]) {
//       const blank = Array(baseTimes.length).fill(0).map(() => []);
//       result.nodes_info[node] = { cpus: blank.slice(), job_id: blank.slice() };
//       (serviceListattr || []).forEach(k => (result.nodes_info[node][k] = blank.slice()));
//     }
//   }

//   // ---- Write only the selected metric for nodes present in metricJson
//   for (const node of metricNodes) {
//     const srcNode = metricJson.nodes_info[node];
//     const srcArr  = srcNode && srcNode[metricName];
//     if (!Array.isArray(srcArr)) continue;

//     const aligned = Array(baseTimes.length).fill(0).map(() => []);
//     for (let bi = 0; bi < idxMap.length; bi++) {
//       const mj = idxMap[bi];
//       if (mj >= 0 && mj < srcArr.length) {
//         const v = srcArr[mj];
//         aligned[bi] = Array.isArray(v) ? v : [v];  // keep array-per-time shape
//       }
//     }
//     result.nodes_info[node] = { ...result.nodes_info[node], [metricName]: aligned };
//   }

//   // NOTE: result.time_stamp is left exactly as in base (numbers or Dates).
//   return result;
// }
function mergeMetricIntoBase(base, metricJson, metricName) {
  // clone shallowly so we don’t mutate the original base object
  const result = {
    ...base,
    nodes_info: { ...base.nodes_info },
    jobs_info: base.jobs_info ? { ...base.jobs_info } : {},
  };

  // keep metric jobs_info if a metric file includes it
  if (metricJson.jobs_info) {
    for (const [jid, job] of Object.entries(metricJson.jobs_info)) {
      if (!result.jobs_info[jid]) result.jobs_info[jid] = job;
    }
  }

  // normalize times to numbers
  const baseTimes = (base.time_stamp || []).map(t => +t);
  const metricTimes = (metricJson.time_stamp || []).map(t => +t);
  if (!baseTimes.length || !metricTimes.length) return result;

  // unit detection
  const uBase = guessUnit(baseTimes[0]);   // s | ms | ns
  const uMet  = guessUnit(metricTimes[0]);

  const to = (v, from, to) => convertBetween(from, to, v);
  const baseNs   = uBase === 'ns' ? baseTimes : baseTimes.map(t => to(t, uBase, 'ns'));
  const metricNs = uMet  === 'ns' ? metricTimes : metricTimes.map(t => to(t, uMet, 'ns'));

  // build nearest index with half-step tolerance
  const step = medianStep(baseNs);
  const tol = Math.max(1, step / 2);
  const mapIdx = buildNearestIndex(baseNs, metricNs, tol);

  // align per node -> metricName
  const metricNodes = Object.keys(metricJson.nodes_info || {});
  for (const node of metricNodes) {
    const srcNode = metricJson.nodes_info[node] || {};
    const srcArr  = srcNode[metricName];
    if (!Array.isArray(srcArr)) continue;

    // Ensure node exists on result with time-sized arrays for metricName
    if (!result.nodes_info[node]) result.nodes_info[node] = {};
    const aligned = Array(baseNs.length).fill(0).map(() => []);

    for (let bi = 0; bi < mapIdx.length; bi++) {
      const j = mapIdx[bi];
      if (j >= 0 && j < srcArr.length) {
        const v = srcArr[j];
        aligned[bi] = Array.isArray(v) ? v : (v == null ? [] : [v]);
      }
    }

    result.nodes_info[node] = {
      ...result.nodes_info[node],
      [metricName]: aligned
    };
  }

  return result;
}


async function loadMetricIntoBaseAndDraw(metricName) {
  console.log('Loading metric:', metricName);
  if (!baseData) {
    console.warn('Base data not ready yet; load sample/historical first.');
    return;
  }
  updateProcess({ percentage: 45, text: `Loading ${metricName}...` });
  try {
    const metricJson = await fetchMetricJSON(metricName);
    console.log(`Merging metric ${metricName}`, metricJson);
    const merged = mergeMetricIntoBase(baseData, metricJson, metricName);
    console.log(`Merged result for ${metricName}`, merged);
    request = new Simulation(Promise.resolve(merged));
    console.log(request);
    setTimeout(() => {
      subObject.graphicopt({ selectedService: serviceSelected }).draw();
      drawColorLegend();
      updateProcess();
      
    }, 0);
  } catch (e) {
    console.warn(e);
    updateProcess();
    // fallback: leave base as-is but redraw UI to reflect selection
    request = new Simulation(Promise.resolve(baseData));
    console.log(request);
    setTimeout(() => {
      subObject.graphicopt({ selectedService: serviceSelected }).draw();
      drawColorLegend();
    }, 0);
  }
}




// Read available metrics from the Python summary CSVs; fall back to current list.
async function getAvailableMetrics(fallbackList = []) {
  // console.log(fallbackList)
  const names = new Set();
  try {
    const rows = await d3.csv('src/data/metrics_output/metrics_with_data.csv');
    rows.forEach(r => r.metric && names.add(r.metric));
  } catch (e) {}
  // try {
  //   const rows = await d3.csv('src/data/metrics_output/metrics_without_data.csv');
  //   rows.forEach(r => r.metric && names.add(r.metric));
  // } catch (e) {}
  // console.log('Discovered metrics:', names);
  return names.size ? fallbackList.slice().concat(Array.from(names).sort()) : fallbackList.slice();
}

function rebuildServiceListsFromMetrics(metricNames) {
  const prevName = (serviceFullList && serviceFullList[serviceSelected])
    ? serviceFullList[serviceSelected].text
    : null;

  serviceListattr = metricNames.slice();
  serviceLists = serviceListattr.map((key, index) => ({
    text: key,
    id: index,
    enable: true,
    sub: [{
      text: key,
      id: 0,
      enable: true,
      idroot: index,
      angle: 0,
      range: [0, 3000],
    }]
  }));

  serviceFullList = [];
  serviceLists.forEach(s => s.sub.forEach(ss => serviceFullList.push(ss)));

  if (prevName) {
    const i = serviceFullList.findIndex(d => d.text === prevName);
    serviceSelected = i >= 0 ? i : 0;
  } else {
    serviceSelected = 0;
  }

  serviceControl();  // re-render dropdown with new list
}

async function initFlowTypeFromFiles() {
  const metrics = await getAvailableMetrics(serviceListattr || []);
  console.log('Metrics for services:', metrics);
  rebuildServiceListsFromMetrics(metrics);
}

//////////////////////////////////////////////////////////////////////////////////////////

// async function loadHistoricalAcrossRanges() {
//   const start = document.getElementById('startTime')?.value;
//   const end = document.getElementById('endTime')?.value;
//   if (!start || !end) {
//     console.warn('Start or End time is missing.');
//     return;
//   }

//   const data = await fetchAllNodeRanges(start, end);
//   request = new Simulation(Promise.resolve(data)); // you might need to adapt Simulation constructor
//   initdraw();
//   initTimeElement();
// }

async function loadHistoricalAcrossRanges() {
  const start = document.getElementById('startTime')?.value;
  const end = document.getElementById('endTime')?.value;

  if (!start || !end) {
    console.warn('Start or End time is missing.');
    return;
  }

  if (document.getElementById('realTimeRange').value == -3) {
    const data = await fetchDataAndProcess({}, false);

    // Convert to timestamps (milliseconds)
    const startDate = new Date(start).getTime() * 1e6; // Convert to milliseconds
    const endDate = new Date(end).getTime() * 1e6; // Convert to milliseconds

    console.log('Start date:', startDate, 'End date:', endDate);
    console.log('Data timestamps:', data.time_stamp);
    // Ensure time_stamp is in milliseconds
    data.time_stamp = data.time_stamp.map(d => d instanceof Date ? d.getTime() : d);
    console.log('Data timestamps:', data.time_stamp);

    const validIndexes = data.time_stamp
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t >= startDate && t <= endDate)
      .map(({ i }) => i);

    const filteredTimestamps = validIndexes.map(i => data.time_stamp[i]);

    const filteredNodesInfo = {};
    for (const [node, metrics] of Object.entries(data.nodes_info)) {
      const filteredMetrics = {};
      for (const [key, arr] of Object.entries(metrics)) {
        filteredMetrics[key] = Array.isArray(arr)
          ? validIndexes.map(i => arr[i])
          : arr;
      }
      filteredNodesInfo[node] = filteredMetrics;
    }

    const filteredData = {
      ...data,
      time_stamp: filteredTimestamps,
      nodes_info: filteredNodesInfo,
    };

    request = new Simulation(Promise.resolve(filteredData));

    d3.select('#chartContainer').selectAll("*").remove();
    updateProcess({
      percentage: 5,
      text: 'Load UI...'
    })
    initMenu();
    updateProcess({
      percentage: 15,
      text: 'Preprocess data...'
    });
    initdraw();
    initTimeElement();
  }
 else {
    // Regular fetch mode
    const data = await fetchAllNodeRanges(start, end);
    request = new Simulation(Promise.resolve(data));
    initdraw();
    initTimeElement();
  }
}

function loadHistoricalData() {
  if (realTimeIntervalId) clearInterval(realTimeIntervalId);

  const start = document.getElementById('startTime')?.value;
  const end = document.getElementById('endTime')?.value;

  if (!start || !end) {
    console.warn('Start or End time is missing.');
    return;
  }
  const historicalParams = buildHistoricalParams(start, end);
  request = new Simulation(fetchDataAndProcess(historicalParams));
  initdraw();
    initTimeElement();
}

async function loadSampleData() {
  if (realTimeIntervalId) clearInterval(realTimeIntervalId);
  const data = await fetchDataAndProcess({}, false);
  ////////////////////////////////////////////////////////////////////////////////////
  baseData = data; 
  /////////////////////////////////////////////////////////////////////////////////////
  // Store min/max times from sample data
  const timestamps = data.time_stamp.map(ts => new Date(ts / 1e6)); // Convert from ns to ms
const toUTCMinus6 = ts => new Date(ts - 6 * 60 * 60 * 1000);

sampleMinTime = toUTCMinus6(Math.min(...timestamps));
sampleMaxTime = toUTCMinus6(Math.max(...timestamps));



  if (sampleMinTime && sampleMaxTime) {
    const startInput = d3.select('#startTime').node();
    const endInput = d3.select('#endTime').node();

    // Format: YYYY-MM-DDTHH:mm
    const toInputValue = d => d.toISOString().slice(0, 16);

    const minStr = toInputValue(sampleMinTime);
    const maxStr = toInputValue(sampleMaxTime);

    // 👇 Limit the allowed selectable range
    startInput.min = endInput.min = minStr;
    startInput.max = endInput.max = maxStr;

    // Optional: set default values
    startInput.value = minStr;
    endInput.value = maxStr;
    }
    request = new Simulation(Promise.resolve(data));

    updateProcess({
      percentage: 5,
      text: 'Load UI...'
    })
    initMenu();
    updateProcess({
      percentage: 15,
      text: 'Preprocess data...'
    });
    initdraw();
    initTimeElement();
    }
    d3.selectAll('#navMode li a').on('click', function () {
      const mode = d3.select(this.parentNode).classed('realtime') ? 'realTime' : 'historical';
      renderModeMenu(mode);
      setTimeout(() => {
        loadSampleData();

      }, 100);
    });

$(document).ready(function () {
    try {
        // let mode = window.location.search.substring(1).split("mode=")[1].split('&')[0].replace(/%20/g,' '); // get data name after app=
        let command = window.location.search.substring(1).split("&").map(d => d.split('='));
        command = _.object(command.map(d => d[0]), command.map(d => d[1]));

        if (command.service !== undefined && _.isNumber(+command.service))
            serviceSelected = +command.service;
        if (command.metric !== undefined && _.isNumber(+command.metric))
            serviceSelected = +command.metric;
//         // serviceListattr = [
//         //     "system_power", "gpu_power", "cpu_power", "dram_power",
//         //     "gpu_mem", "gpu_usage", "cpu_usage", "dram_usage",
//         // ];
//         // serviceListattr = [
//         //   "system_power", "cpu_power", "temperature", "cpu_usage",
//         // ];
//         // if (document.getElementById('realTimeRange').value == -3) {
//           // serviceListattr = ["system_power","cpu_power", "temperature", "cpu_usage", "memory_usage", 'ampsreading', 'availablespare', 'availablesparethreshold', 'compositetemperature', 'computepower', 'controllerbusytimelower', 'cpupower', 'cpuusage', 'cpuusagepctreading', 'dataunitsreadlower', 'dataunitswrittenlower', 'hostreadcommandslower', 'hostwritecommandslower', 'itue', 'powercycleslower', 'poweronhourslower', 'powertocoolratio', 'psuefficiency', 'psurpmreading', 'psutemperaturereading', 'rpmreading', 'sysairflowefficiency', 'sysairflowperfanpower', 'sysairflowpersysinputpower', 'sysairflowutilization', 'sysnetairflow', 'sysracktempdelta', 'systemheadroominstantaneous', 'systeminputpower', 'systemoutputpower', 'systempowerconsumption', 'temperaturereading', 'totalcpupower', 'totalfanpower', 'totalmemorypower', 'totalpsuheatdissipation', 'totalstoragepower', 'unsafeshutdownslower', 'voltagereading', 'wattsreading'];
//         // }
//         // else if (document.getElementById('realTimeRange').value == -4) {
//         // serviceListattr = [
//         //   "system_power", "cpu_power", "temperature", "cpu_usage", "memory_usage",
//         //   "aggregateusage", "ampsreading", "availablespare", "availablesparethreshold",
//         //   "avgfrequencyacrosscores", "compositetemperature", "computepower",
//         //   "controllerbusytimelower", "cpuavgpbmratiocounterlow", "cpuc0residencyhigh",
//         //   "cpuc0residencylow", "cpuepi", "cpulimitingcounter", "cpupkgenergy",
//         //   "cpupower", "cpuusage", "cpuusagepctreading", "cpuviolationcounter",
//         //   "dataunitsreadlower", "dataunitswrittenlower", "ddrlimitingcounter",
//         //   "drampkgenergy", "drampwr", "dramthrottling", "drivetemperature",
//         //   "eccerate", "energytimestamp", "gpuarbitratedpowerlimit", "gpuclockfrequency",
//         //   "gpumemoryclockfrequency", "gpumemoryusage", "gpuusage", "hostreadcommandslower",
//         //   "hostwritecommandslower", "iousage", "iousagepctreading", "itue", "limitingevents",
//         //   "mediawritecount", "memorytemperature", "memoryusage", "memoryusagepctreading",
//         //   "percentdriveliferemaining", "pkgpwr", "pkgthermalstatus", "powerconsumption",
//         //   "powercyclecount", "powercycleslower", "poweronhours", "poweronhourslower",
//         //   "powertocoolratio", "primarytemperature", "psuefficiency", "psurpmreading",
//         //   "psutemperaturereading", "readerrorrate", "rpmreading", "sysairflowefficiency",
//         //   "sysairflowperfanpower", "sysairflowpersysinputpower", "sysairflowutilization",
//         //   "sysnetairflow", "sysracktempdelta", "systemheadroominstantaneous",
//         //   "systeminputpower", "systemoutputpower", "systempowerconsumption",
//         //   "systemusagepctreading", "tctrl", "temperaturereading", "tjmax", "totalcpupower",
//         //   "totalfanpower", "totalmemorypower", "totalpsuheatdissipation", "totalstoragepower",
//         //   "unsafeshutdownslower", "unusedreservedblockcount", "usedreservedblockcount",
//         //   "voltagereading", "wattsreading"
//         // ];
//         // }
        

//         // serviceListattr = ["system_power","cpu_power", "temperature", "cpu_usage", "memory_usage", 'ampsreading', 'availablespare', 'availablesparethreshold', 'compositetemperature', 'computepower', 'controllerbusytimelower', 'cpupower', 'cpuusage', 'cpuusagepctreading', 'dataunitsreadlower', 'dataunitswrittenlower', 'hostreadcommandslower', 'hostwritecommandslower', 'itue', 'powercycleslower', 'poweronhourslower', 'powertocoolratio', 'psuefficiency', 'psurpmreading', 'psutemperaturereading', 'rpmreading', 'sysairflowefficiency', 'sysairflowperfanpower', 'sysairflowpersysinputpower', 'sysairflowutilization', 'sysnetairflow', 'sysracktempdelta', 'systemheadroominstantaneous', 'systeminputpower', 'systemoutputpower', 'systempowerconsumption', 'temperaturereading', 'totalcpupower', 'totalfanpower', 'totalmemorypower', 'totalpsuheatdissipation', 'totalstoragepower', 'unsafeshutdownslower', 'voltagereading', 'wattsreading'];
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// // debugger
// // initFlowTypeFromFiles();
// // debugger
// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//         serviceLists = serviceListattr.map((key, index) => ({
//             text: key,
//             id: index,
//             enable: true,
//             sub: [{
//                 text: key,
//                 id: 0,
//                 enable: true,
//                 idroot: index,
//                 angle: (2 * Math.PI * index) / serviceListattr.length,
//                 range: [0, 3000],
//             }]
//         }));
//         serviceFullList = [];
//         serviceLists.forEach(s => s.sub.forEach(ss => serviceFullList.push(ss)));
//         serviceList_selected = serviceListattr.map((key, i) => ({
//             text: key,
//             index: i
//         }));
//         alternative_service = [...serviceListattr];
//         alternative_scale = Array(serviceListattr.length).fill(1);
            renderModeMenu();
            applyServiceListForRange("-3");
            loadSampleData();
    } catch (e) {
        request = new Simulation('src/data/922020-932020-145000.json');
    }
    updateProcess({percentage: 5, text: 'Load UI...'})
    initMenu();
    updateProcess({percentage: 15, text: 'Preprocess data...'});
});
function handleInputSlumrData(data) {
    const jobObjArr = {};
    Object.keys(data.jobs_info).forEach(key => {
        const d = data.jobs_info[key];
        d.job_id = d.job_id || key;
        d["submit_time"] = d["submit_time"] * 1000000000;
        d["start_time"] = d["start_time"] * 1000000000;
        d["end_time"] = d["end_time"] * 1000000000;
        d.node_list = d.nodes.slice();
        d.job_name = d.name;
        if (d.array_task_id !== null && d.array_job_id) {
            d.job_array_id = 'array' + d.array_job_id;
            if (!jobObjArr[d.job_array_id]) {
                jobObjArr[d.job_array_id] = {
                    isJobarray: true,
                    job_id: d.job_array_id,
                    job_ids: {},
                    "finish_time": null,
                    "end_time": null,
                    "job_name": d.name,
                    "node_list": [],
                    "node_list_obj": {},
                    "total_nodes": 0,
                    "user_name": d.user_name,
                    start_time: d.start_time,
                    submit_time: d.submit_time
                }
                jobObjArr[d.job_array_id].job_ids[d.job_id] = d;
            } else {
                jobObjArr[d.job_array_id].job_ids[d.job_id] = d;
                if (d.start_time < jobObjArr[d.job_array_id].start_time)
                    jobObjArr[d.job_array_id].start_time = d.start_time;
                if (d.submit_time < jobObjArr[d.job_array_id].submit_time)
                    jobObjArr[d.job_array_id].submit_time = d.submit_time;
            }
        }
    });
    Object.keys(jobObjArr).forEach(j => {
        data.jobs_info[j] = jobObjArr[j];
    })
    const jobs_info = {};
    Object.keys(data.nodes_info).forEach(comp => {
        const d = data.nodes_info[comp]
        d.job_id = d.jobs;
        delete d.jobs;
        d.job_id.forEach((js, ti) => {
            if (!js) {
                d.job_id[ti] = [];
                js = d.job_id[ti];
            }
            js.forEach((j, i) => {
                if (data.jobs_info[j] && (!jobs_info[j])) {
                    jobs_info[j] = data.jobs_info[j];
                    jobs_info[j].node_list_obj = {};
                    jobs_info[j].node_list = [];
                    jobs_info[j].total_nodes = 0;
                } else if (!jobs_info[j]) {
                    jobs_info[j] = {
                        "job_id": j,
                        "cpu_cores": d.cpus[ti][i],
                        "finish_time": null,
                        "end_time": null,
                        "job_name": '' + j,
                        "node_list": [],
                        "node_list_obj": {},
                        "start_time": data.time_stamp[i],
                        "submit_time": data.time_stamp[i],
                        "total_nodes": 0,
                        "user_name": "unknown",
                        user_id: -1
                    }
                }
                const job_array_id = jobs_info[j].job_array_id;
                if (job_array_id && (!jobs_info[job_array_id])) {
                    jobs_info[job_array_id] = data.jobs_info[job_array_id];
                    jobs_info[job_array_id].node_list_obj = {};
                    jobs_info[job_array_id].node_list = [];
                    jobs_info[job_array_id].total_nodes = 0;
                }
                if (!jobs_info[j].node_list_obj[comp]) {
                    jobs_info[j].node_list_obj[comp] = (d.cpus && d.cpus[ti]) ? d.cpus[ti][i] : 1;
                    jobs_info[j].node_list.push(comp);
                    jobs_info[j].total_nodes++;
                }

                jobs_info[j].finish_time = data.time_stamp[i];
                if (job_array_id) {
                    if (!jobs_info[job_array_id].node_list_obj[comp]) {
                        jobs_info[job_array_id].node_list_obj[comp] = (d.cpus && d.cpus[ti]) ? d.cpus[ti][i] : 1;
                        jobs_info[job_array_id].node_list.push(comp);
                        jobs_info[job_array_id].total_nodes++;
                    }
                    jobs_info[job_array_id].finish_time = data.time_stamp[i];
                }
            })
        })
    });
    console.log(Object.keys(data.jobs_info).length, Object.keys(jobs_info).length)
    data.jobs_info = jobs_info;
    return data;
}
function updateServiceRanges(data) {
  const metrics = serviceListattr; // like ["system_power", "cpu_power", ...]
  const rangeMap = {};

  // Initialize min/max for each metric
  for (const metric of metrics) {
   rangeMap[metric] = { min: Infinity, max: -Infinity, sum: 0, count: 0 };
  }
  // Loop through nodes and update min/max values
  for (const node in data.nodes_info) {
    const info = data.nodes_info[node];
    metrics.forEach(metric => {
      const values = (info[metric] || []).flat();
      rangeMap[metric].min = Math.min(rangeMap[metric].min, Math.min(...values));
      rangeMap[metric].max = Math.max(rangeMap[metric].max, Math.max(...values));
      rangeMap[metric].sum += values.reduce((a, b) => a + b, 0);
rangeMap[metric].count += values.length;
    });
  }

for (const service of serviceLists) {
  const metric = service.idroot != null ? serviceListattr[service.idroot] : service.text;
  const r = rangeMap[metric];
  if (r && r.min !== Infinity && r.max !== -Infinity) {
    service.sub[0].range = [Math.floor(r.min), Math.ceil(r.max)];
    service.sub[0].defaultThreshold = rangeMap[metric].count > 0
  ? Math.floor(rangeMap[metric].sum / rangeMap[metric].count)
  : 0;
  }
}

  console.log("Updated ranges:", serviceLists.map(s => ({
    metric: s.text,
    range: s.sub[0].range,
    defaultThreshold: s.sub[0].defaultThreshold
  })));
}

function initTimeElement() {
    request.onDataChange.push((data) => {
        updateProcess({percentage: 50, text: 'Preprocess data'})
        setTimeout(() => {
          updateServiceRanges(data);
            d3.select('#dataTime').text(new Date(data.time_stamp[0]).toDateString());
            serviceControl();
            handleRankingData(data);
            updateProcess({percentage: 80, text: 'Preprocess data'});
            $('#JobFilterThreshold').val(Object.keys(Layout.jobsStatic).length);
            drawJobList();
            initdrawGantt();
            drawGantt();
            drawUserList();
            drawComputeList();
            updateProcess();
        }, 0);
    });
}
