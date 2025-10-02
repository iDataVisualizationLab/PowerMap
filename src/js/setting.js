serviceFullList = [{"text":"CPU1 Temp","id":0,"enable":true,"idroot":0,"angle":5.585053606381854,"range":[3,98]},{"text":"CPU2 Temp","id":1,"enable":true,"idroot":0,"angle":0,"range":[3,98]},{"text":"Inlet Temp","id":2,"enable":true,"idroot":0,"angle":0.6981317007977318,"range":[3,98]},{"text":"Memory usage","id":0,"enable":true,"idroot":1,"angle":1.5707963267948966,"range":[0,99]},{"text":"Fan1 speed","id":0,"enable":true,"idroot":2,"angle":2.4870941840919194,"range":[1050,17850]},{"text":"Fan2 speed","id":1,"enable":true,"idroot":2,"angle":2.923426497090502,"range":[1050,17850]},{"text":"Fan3 speed","id":2,"enable":true,"idroot":2,"angle":3.3597588100890845,"range":[1050,17850]},{"text":"Fan4 speed","id":3,"enable":true,"idroot":2,"angle":3.796091123087667,"range":[1050,17850]},{"text":"Power consumption","id":0,"enable":true,"idroot":3,"angle":4.71238898038469,"range":[0,200]}]
serviceListattr = ["arrTemperature", "arrMemory_usage", "arrFans_health", "arrPower_usage"];
var serviceLists = [{"text":"Temperature","id":0,"enable":true,"sub":[{"text":"CPU1 Temp","id":0,"enable":true,"idroot":0,"angle":5.585053606381854,"range":[3,98]},{"text":"CPU2 Temp","id":1,"enable":true,"idroot":0,"angle":0,"range":[3,98]},{"text":"Inlet Temp","id":2,"enable":true,"idroot":0,"angle":0.6981317007977318,"range":[3,98]}]},{"text":"Memory_usage","id":1,"enable":true,"sub":[{"text":"Memory usage","id":0,"enable":true,"idroot":1,"angle":1.5707963267948966,"range":[0,99]}]},{"text":"Fans_speed","id":2,"enable":true,"sub":[{"text":"Fan1 speed","id":0,"enable":true,"idroot":2,"angle":2.4870941840919194,"range":[1050,17850]},{"text":"Fan2 speed","id":1,"enable":true,"idroot":2,"angle":2.923426497090502,"range":[1050,17850]},{"text":"Fan3 speed","id":2,"enable":true,"idroot":2,"angle":3.3597588100890845,"range":[1050,17850]},{"text":"Fan4 speed","id":3,"enable":true,"idroot":2,"angle":3.796091123087667,"range":[1050,17850]}]},{"text":"Power_consum","id":3,"enable":true,"sub":[{"text":"Power consumption","id":0,"enable":true,"idroot":3,"angle":4.71238898038469,"range":[0,200]}]}];
var serviceList_selected = [{"text":"Temperature","index":0},{"text":"Memory_usage","index":1},{"text":"Fans_speed","index":2},{"text":"Power_consum","index":3}];
var alternative_service = ["cpu_inl_temp", "memory_usage", "fan_speed", "power_usage"];
var alternative_scale = [1,1,1,0.5];
let colorScaleList = {
    n: 7,
    rainbow: ["#000066", "#4400ff", "#00ddff", "#00ddaa", "#00dd00", "#aadd00", "#ffcc00", "#ff8800", "#ff0000", "#660000"],
    soil: ["#2244AA","#4A8FC2", "#76A5B1", "#9DBCA2", "#C3D392", "#F8E571", "#F2B659", "#eb6424", "#D63128", "#660000"],
    customschemeCategory:  ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#bcbd22", "#17becf"],
    customFunc: function(name,arr,num){
        const n= num||this.n;
        const arrColor = arr||this[name];
        let colorLength = arrColor.length;
        const arrThresholds=d3.range(0,colorLength).map(e=>e/(colorLength-1));
        let colorTemperature = d3.scaleLinear()
            .domain(arrThresholds)
            .range(arrColor)
            .interpolate(d3.interpolateHcl);

        return d3.range(0,n).map(e=>colorTemperature(e/(n-1)))
    },
    d3colorChosefunc: function(name,num){
        const n = num|| this.n;
        if (d3[`scheme${name}`]) {
            if (typeof (d3[`scheme${name}`][0]) !== 'string') {
                colors = (d3[`scheme${name}`][n]||d3[`scheme${name}`][d3[`scheme${name}`].length-1]).slice();
            }
            else
                colors=  d3[`scheme${name}`].slice();
        } else {
            const interpolate = d3[`interpolate${name}`];
            colors = [];
            for (let i = 0; i < n; ++i) {
                colors.push(d3.rgb(interpolate(i / (n - 1))).hex());
            }
        }
        colors = this.customFunc(undefined,colors,n);
        return colors;
    },
},colorArr = {Radar: [
        {val: 'rainbow',type:'custom',label: 'Rainbow'},
        {val: 'RdBu',type:'d3',label: 'Blue2Red',invert:true},
        {val: 'soil',type:'custom',label: 'RedYelBlu'},
        {val: 'Viridis',type:'d3',label: 'Viridis'},
        {val: 'Greys',type:'d3',label: 'Greys'}],
    Cluster: [{val: 'Category10',type:'d3',label: 'D3'},{val: 'Paired',type:'d3',label: 'Blue2Red'}]};
let scaleService;

function handleDataUrl(dataRaw) {
    let hosts = d3.keys(dataRaw.nodes_info).map(ip=>{
        return {
            ip: ip,
            name: ip,
        }
    });
    d3.keys(dataRaw.jobs_info).forEach(jID=>{
        dataRaw.jobs_info[jID].node_list = dataRaw.jobs_info[jID].node_list.map(c=>c.split('-')[0]);
        if(dataRaw.jobs_info[jID].start_time>9999999999999)
        {dataRaw.jobs_info[jID].start_time = dataRaw.jobs_info[jID].start_time/1000000
        dataRaw.jobs_info[jID].submit_time = dataRaw.jobs_info[jID].submit_time/1000000
        if (dataRaw.jobs_info[jID].finish_time && data.jobs_info[jID].finish_time>9999999999999)
            dataRaw.jobs_info[jID].finish_time = dataRaw.jobs_info[jID].finish_time/1000000}
    })
    let time_stamp = dataRaw.time_stamp.map(d=>d/1000000)
    var alternative_service = ["cpu_inl_temp", "memory_usage", "fan_speed", "power_usage"];
    var alternative_scale = [1,1,1,0.5];

    var sampleh = {};
    var ser = serviceListattr.slice();
    // ser.pop();
    let tsnedata = {};
    let data = dataRaw.nodes_info;
    sampleh.timespan = time_stamp.map(d=>d*1000);
    // scaleService = d3.nest().key(d=>d.idroot).rollup(d=>d3.scaleLinear().domain(d[0].range)).object(serviceFullList);
scaleService = {};
(serviceFullList || []).forEach(s => {
  const r = (Array.isArray(s.range) && s.range.length === 2) ? s.range : [0, 1];
  scaleService[s.idroot] = d3.scaleLinear().domain(r);
});
    hosts.forEach(h => {
        sampleh[h.name] = {};
        tsnedata[h.name] = [];
        ser.forEach(s => sampleh[h.name][s] = []);
        alternative_service.forEach((sa, si) => {
            var scale = alternative_scale[si];
            sampleh.timespan.forEach((dt, ti) => {
                let value = [];
                if (!_.isArray(data[h.ip][sa][ti])){
                    data[h.ip][sa][ti] = [data[h.ip][sa][ti]]
                }
                for (let ii = 0;ii<serviceLists[si].sub.length;ii++){
                    value.push((data[h.ip][sa][ti][ii]==='' || data[h.ip][sa][ti][ii]===undefined)?null:data[h.ip][sa][ti][ii]*scale)
                }
                let arrID = serviceListattr[si];
                let currentIndex =  sampleh[h.name][arrID].length;
                sampleh[h.name][arrID][ti] = value;

                if (tsnedata[h.name][currentIndex]===undefined){
                    tsnedata[h.name][currentIndex] = [];
                    tsnedata[h.name][currentIndex].name = h.name;
                    tsnedata[h.name][currentIndex].timestep =currentIndex;
                }
                value.forEach(v=>tsnedata[h.name][currentIndex].push(v === null ? 0 : scaleService[si](v) || 0))
            })
        })
    });

    return{sampleS:sampleh,tsnedata:tsnedata};
}
// function handleSmalldata(dataRaw){
//     let hosts = d3.keys(dataRaw.nodes_info).map(ip=>{
//         return {
//             ip: ip,
//             name: ip,
//         }
//     });
//     scaleService = d3.nest().key(d=>d.idroot).rollup(d=>d3.scaleLinear().domain(d[0].range)).object(serviceFullList);
//     let time_stamp = dataRaw.time_stamp.map(d=>d>9999999999999?(d/1000000):d)
//     let sampleh = {};

//     var ser = serviceListattr.slice();
//     sampleh.timespan = time_stamp.map(d=>d);
//     let tsnedata = {};
//     let minMaxData = {};
//     let data = dataRaw.nodes_info;
//     hosts.forEach(h => {
//         // console.time(h.name)
//         sampleh[h.name] = {};
//         tsnedata[h.name] = [];
//         minMaxData[h.name] = [];
//         ser.forEach(s => sampleh[h.name][s] = []);
//         alternative_service.forEach((sa, si) => {
//             var scale = alternative_scale[si];
//             sampleh.timespan.forEach((dt, ti) => {
//                 let value = [];
//                 if (!_.isArray(data[h.ip][sa][ti])){
//                     data[h.ip][sa][ti] = [data[h.ip][sa][ti]]
//                 }
//                 for (let ii = 0;ii<serviceLists[si].sub.length;ii++){
//                     value.push((data[h.ip][sa][ti][ii]==='' || (data[h.ip][sa][ti][ii]===undefined||data[h.ip][sa][ti][ii]===null))?null:data[h.ip][sa][ti][ii]*scale)
//                 }
//                 let arrID = serviceListattr[si];
//                 sampleh[h.name][arrID][ti] = value;
//                 if (tsnedata[h.name][ti]===undefined){
//                     tsnedata[h.name][ti] = [];
//                     tsnedata[h.name][ti].name = h.name;
//                     tsnedata[h.name][ti].timestep =ti;
//                     minMaxData[h.name][ti] = [[],[]];
//                     minMaxData[h.name][ti].name = h.name;
//                     minMaxData[h.name][ti].timestep =ti;
//                 }
//                 value.forEach(v=>{
//                     const val = v === null ? undefined : scaleService[si](v);
//                     tsnedata[h.name][ti].push(val);
//                     minMaxData[h.name][ti][0].push(val);
//                     minMaxData[h.name][ti][1].push(val);
//                 });
//             })
//         })
//         // console.timeEnd(h.name)
//     });
//     return {sampleh,tsnedata,minMaxData};
// }
function handleSmalldata(dataRaw) {
  var nodes, tsRaw, time_stamp;
  var sampleh, tsnedata, minMaxData;

  nodes = (dataRaw && dataRaw.nodes_info) ? dataRaw.nodes_info : {};
  tsRaw = Array.isArray(dataRaw && dataRaw.time_stamp) ? dataRaw.time_stamp : [];
  // Normalize time units: if looks like ns, convert to ms; otherwise keep as number
  time_stamp = tsRaw.map(function(d) { return (+d > 9999999999999) ? Math.floor(+d / 1e6) : +d; });

  sampleh = { timespan: time_stamp.slice() };
  tsnedata = {};
  minMaxData = {};

  // Ensure these globals are defined
  const ser = Array.isArray(serviceListattr) ? serviceListattr.slice() : [];
  const alt = Array.isArray(alternative_service) ? alternative_service : ser;
  const altScale = Array.isArray(alternative_scale) ? alternative_scale : new Array(alt.length).fill(1);

  // Build scales per idroot from serviceFullList ranges; fallback to identity
  const scalesByIdroot = {};
  (serviceFullList || []).forEach(s => {
    const idroot = (s.idroot != null) ? s.idroot : 0;
    const rng = (s.range && s.range.length === 2) ? s.range : [0, 1];
    if (!scalesByIdroot[idroot]) {
      scalesByIdroot[idroot] = d3.scaleLinear().domain(rng);
    }
  });

  const hosts = Object.keys(nodes).map(ip => ({ ip, name: ip }));

  hosts.forEach(h => {
    sampleh[h.name] = {};
    tsnedata[h.name] = [];
    minMaxData[h.name] = [];

    // pre-allocate arrays for each canonical metric key in `ser`
    ser.forEach(sKey => { sampleh[h.name][sKey] = new Array(time_stamp.length); });

    alt.forEach((sa, si) => {
      // Try to map the alternative index -> idroot for scales; fallback to si
      const idroot = serviceLists?.[si]?.sub?.[0]?.idroot ?? si;
      const scaleMul = +altScale[si] || 1;
      const scaleSvc = scalesByIdroot[idroot] || (x => x); // identity if missing

      const series = Array.isArray(nodes[h.ip]?.[sa]) ? nodes[h.ip][sa] : [];

      for (let ti = 0; ti < time_stamp.length; ti++) {
        // Get the raw value at t; coerce to array safely
        const rawAtT = series[ti];
        const arrAtT = Array.isArray(rawAtT)
          ? rawAtT.slice()
          : (rawAtT != null ? [rawAtT] : []);

        // How many sub-dimensions to output? Prefer serviceLists[si].sub length if present
        const subLen = (serviceLists?.[si]?.sub?.length) || arrAtT.length || 1;

        const mapped = new Array(subLen).fill(null).map((_, ii) => {
          const v = arrAtT[ii];
          return (v === '' || v == null) ? null : (v * scaleMul);
        });

        // Decide the destination key in sampleh: match by `ser[si]` if possible, else use `sa`
        const destKey = (ser[si] != null ? ser[si] : sa);
        if (!sampleh[h.name][destKey]) {
          sampleh[h.name][destKey] = new Array(time_stamp.length);
        }
        sampleh[h.name][destKey][ti] = mapped;

        // Init tsnedata/minMaxData rows on first touch
        if (!tsnedata[h.name][ti]) {
          tsnedata[h.name][ti] = [];
          tsnedata[h.name][ti].name = h.name;
          tsnedata[h.name][ti].timestep = ti;

          minMaxData[h.name][ti] = [[], []];
          minMaxData[h.name][ti].name = h.name;
          minMaxData[h.name][ti].timestep = ti;
        }

        // Push scaled values (allow undefined for nulls)
        mapped.forEach(v => {
          const val = (v === null) ? undefined : scaleSvc(v);
          tsnedata[h.name][ti].push(val);
          minMaxData[h.name][ti][0].push(val);
          minMaxData[h.name][ti][1].push(val);
        });
      }
    });
  });

  return { sampleh, tsnedata, minMaxData };
}

function handleAllData(dataRaw){
    let hosts = d3.keys(dataRaw.nodes_info).map(ip=>{
        return {
            ip: ip,
            name: ip,
        }
    });
    d3.keys(dataRaw.jobs_info).forEach(jID=>{
        dataRaw.jobs_info[jID].node_list_short = dataRaw.jobs_info[jID].node_list.map(c=>c.split('-')[0]);
        if(dataRaw.jobs_info[jID].start_time>9999999999999)
        {dataRaw.jobs_info[jID].start_time = dataRaw.jobs_info[jID].start_time/1000000;
            dataRaw.jobs_info[jID].submit_time = dataRaw.jobs_info[jID].submit_time/1000000
            if (dataRaw.jobs_info[jID].finish_time  && data.jobs_info[jID].finish_time>9999999999999)
                dataRaw.jobs_info[jID].finish_time = dataRaw.jobs_info[jID].finish_time/1000000}
    });
    scaleService = d3.nest().key(d=>d.idroot).rollup(d=>d3.scaleLinear().domain(d[0].range)).object(serviceFullList);
    let time_stamp = dataRaw.time_stamp.map(d=>d/1000000);
    let sampleh = {};
    var ser = serviceListattr.slice();
    // ser.pop();
    sampleh.timespan = time_stamp.map(d=>d*1000);
    let data = dataRaw.nodes_info;
    hosts.forEach(h => {
        sampleh[h.name] = {};
        ser.forEach(s => sampleh[h.name][s] = []);
        alternative_service.forEach((sa, si) => {
            var scale = alternative_scale[si];
            sampleh.timespan.forEach((dt, ti) => {
                let value = [];
                if (!_.isArray(data[h.ip][sa][ti])){
                    data[h.ip][sa][ti] = [data[h.ip][sa][ti]]
                }
                for (let ii = 0;ii<serviceLists[si].sub.length;ii++){
                    value.push((data[h.ip][sa][ti][ii]==='' || data[h.ip][sa][ti][ii]===undefined)?null:data[h.ip][sa][ti][ii]*scale)
                }
                let arrID = serviceListattr[si];
                sampleh[h.name][arrID][ti] = value;
            })
        })
    });
    return sampleh;
}

function getServiceSet(compObj){
    let notService = {'jobs':true,'cpus':true}
    let comps = d3.values(compObj);
    let sample =comps[0];
    serviceListattr =Object.keys(comps[0]).filter(s=>{
        return _.isArray(sample[s]) && !notService[s]
    });
    const angle = Math.PI*2/serviceListattr.length;
    serviceLists = serviceListattr.map((s,si)=>({
        "text": s,
        "id": si,
        "enable": true,
        "sub": [{"text": s, "id": 0, "enable": true, "idroot": si, "angle": si*angle, "range": [0, 0]}]
    }));
    serviceFullList = [];
    serviceLists.forEach(s=>s.sub.forEach(ss=>serviceFullList.push(ss)));

    serviceList_selected = serviceListattr.map((s,si)=>({"text": s, "index": si}));
    alternative_service = serviceListattr.slice();
    alternative_scale = serviceListattr.map(d=>1);

    comps.forEach(c=>{
        serviceFullList.forEach(s=>{
            const range = d3.extent(c[s.text]);
            if (range[0]<s.range[0])
                s.range[0] = range[0];
            if (range[1]>s.range[1])
                s.range[1] = range[1];
        })
    })

}
