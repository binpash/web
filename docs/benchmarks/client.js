'use strict';
/*
 * Placement functionality for the legend generatior for performance 
 * and correctness tests
 */
let y_pos = []
y_pos[0] = 15
y_pos[1] = 35
let x_pos = []
x_pos[0] = function(a, width, right) {return width - right/2 - a * 130}
x_pos[1] = function(a, width, right) {return width - right/2 - a * 130}

let running_on_website = false;
/*
 * This value is automatically injected by the CI website generating script
 */
let local_data
/*
 * Return the position of a legend entry 
 * i: the index of the current object
 * width: the width of the plot
 * right: the margin right value of the plot
 */
function fetch_item_pos(i, width, right) {
    let res = {};
    res.y = y_pos[0];
    res.x = x_pos[0](i, width, right);
    if (i > 3) {
        res.y = y_pos[1];
        res.x = x_pos[0](i%4, width, right);
    }
    return res
}

let linebreak = document.createElement("br");
let descriptions = {}
descriptions['tight-loop'] = `Benchmarks for loops`
descriptions["Unix50"] = `This contains 36 pipelines solving the Unix 50 game <a href='https://unixgame.io/unix50'>[Labs 2019].</a>
This set is from a recent set of challenges celebrating of Unix's 50-year legacy, solvable by
Unix pipelines. The problems were designed to highlight Unix's modular philosophy
and they make extensive use of standard commands under a variety of flags, and 
 appear to be written by non-experts---contrary to the previous set, they often 
use sub-optimal or non-Unix-y constructs. We execute each pipeline
as-is, without any modification.`

descriptions["Classics"] = `This set contains 9 pipelines: NFA-regex, Sort, 
Top-N, WF, Spell, Difference, Bi-grams, Set-Difference, and Shortest-Scripts. 
Pipelines in this set contain 2-7 stages, ranging from a scalable CPU-intensive grep 
stage in NFA-regex to a non-parallelizable diff stage in Difference. These scripts 
are written by Unix experts: a few pipelines are from Unix legends 
<a href='https://dl.acm.org/doi/10.1145/5948.315654'>[Bentley 1985; Bentley et al. 1986; McIlroy et al. 1978]</a>, 
one from a book on Unix scripting [Taylor 2004], and a few are from top Stackoverflow
answers <a href='https://web.stanford.edu/class/cs124/kwc-unix-for-poets.pdf'>[Jurafsky 2017].</a>`

descriptions["COVID-mts"] = `The set contains 4 pipelines that were
used to analyze real telemetry data from bus schedules during the COVID-19 response in one of
Europe's largest cities <a href="https://insidestory.gr/article/noymera-leoforeia-athinas?token=0MFVISB8N6">
[Tsaliki and Spinellis 2021]</a>. The pipelines compute several statistics on the
transit system per day---such as average serving hours per day and average number of vehicles
per day. Pipelines range between 9 and 10 stages (mean: 9.2) and use typical Unix staples such
as sed, awk, sort, and uniq.`

descriptions["for-loops"] ='for-loops'
descriptions["NLP"] ='test'
descriptions["AvgTemp"] ='AvgTemp'
descriptions["WebIndex"] ='WebIndex'
descriptions["INTERFACE"] ='Interface'
descriptions["COMPILER"] ='Compiler'
descriptions["INTRO"] = 'Intro'

/*
 * Create a button that shows/hides the output log of a benchmark
 * elem: the child object that gets triggeted by button click
 */
function output_log_button(elem) {
    var b = document.createElement('button');
    b.innerHTML = "Show Execution Log";
    b.type = "submit";
    // add padding show it doesn't collide with specs
    //b.style = "margin-left: 4em";
    elem.style.display = 'none'
    b.onclick = function() {
        var div = elem;
        if (div.style.display !== 'none') {
            div.style.display = 'none';
            b.innerHTML = "Show Executiong Log";
        }
        else {
            div.style.display = 'block';
            b.innerHTML = "Hide Execution Log"
        }
    };
    return b
}

/*
 * Draw an svg barplot figure using its svg as index
 * It draws the plot and returns the found object
 */
function draw_barplot_by_id(id) {
    let obj = past_row_runs.find(obj => obj.id == id);
    // the current id does not exist
    if (obj == undefined)
        return undefined
    // fetch all the tests from an entry and plot them
    let tests = JSON.parse(obj.tests)
    for (let i in tests) {
        // append to the right section of the section
        let test = tests[i]
        test.specs = obj.specs
        test.commit = obj.commit
        test.msg = obj.commit_msg
        draw_svg(test)
    }
    return obj
}

/*
 * Hold all the fetched runs
 */
let past_row_runs = undefined
function plot() {
    var div = document.getElementById("past_runs");
    // get the value which is the id we are searching for
    let id = div.options[div.selectedIndex].value
    draw_barplot_by_id(id)
}


function load_workers(cb) {
    const Http = new XMLHttpRequest();
    Http.open("GET", '/fetch_workers');
    Http.send();
    Http.onreadystatechange = (e) => {
        if (Http.readyState == 4 && Http.status == 200) {
            let res = JSON.parse(Http.responseText)
            var select = document.getElementById("workers"); 
            for (let i in res) {
                var opt = res[i];
                var el = document.createElement("option");
                el.textContent = opt;
                el.value = opt;
                select.appendChild(el);
            }
            select.index = 0
        }
    }
}

function load_page(cb) {
    const Http = new XMLHttpRequest();
    Http.open("GET", '/branches');
    Http.send();
    Http.onreadystatechange = (e) => {
        if (Http.readyState == 4 && Http.status == 200) {
            let res = JSON.parse(Http.responseText)
            var select = document.getElementById("branches"); 
            let options = res.split('\n')
            for(var i = 1; i < options.length - 1; i++) {
                var opt = options[i];
                var el = document.createElement("option");
                el.textContent = opt;
                el.value = opt;
                select.appendChild(el);
            }
            select.value = 'main'
            fetch_runs(cb)
        }
    }
}

/*
 * Handle all the run benchmark requests
 */
function do_req() {
    /* update the current tasks */
    var branch = document.getElementById("branches").value;
    var benchmarks = document.getElementById("benchmarks").value;
    var worker = document.getElementById("workers").value;
    const Http = new XMLHttpRequest();
    let val = "job=issue&branch=" + branch + "&benchmark="+benchmarks + "&worker="+worker
    Http.open("GET", val, true);
    Http.send(val);
    fetch_current_task()
    Http.onreadystatechange = (e) => {}
}

function clean_db() {
    const Http = new XMLHttpRequest();
    Http.open("GET", "/clean", true);
    Http.send();
    Http.onreadystatechange = (e) => {
        if (Http.readyState == 4 && Http.status == 200) {
            /* after we have executed a benchmark, update the combobox items */
            fetch_runs();
        }
    }
}

function create_cell(newRow, a) {
    var newCell = newRow.insertCell();
    var newText = document.createTextNode(a);
    newCell.appendChild(newText);
}

function fetch_current_task() {
    const Http = new XMLHttpRequest();
    Http.open("GET", "/current_task", true);
    Http.send();
    Http.onreadystatechange = (e) => {
        if (Http.readyState == 4 && Http.status == 200) {
            let tasks = JSON.parse(Http.responseText)
            let table = document.getElementById("t01")
            let header = table.rows[0]
            table.innerHTML = header.innerHTML
            for (let i in tasks) {
                var newRow = table.insertRow();
                let t = tasks[i]
                create_cell(newRow, t.benchmark)
                create_cell(newRow, t.branch_name)
                create_cell(newRow, t.date + ' ' + t.time)
                create_cell(newRow, t.commit)
                create_cell(newRow, t.host)
                create_cell(newRow, t.name)
            }
        }
    }
}

function create_db() {
    const Http = new XMLHttpRequest();
    Http.open("GET", "/db", true);
    Http.send();
    Http.onreadystatechange = (e) => {
    }
}

function fetch_runs(cb) {
    const Http = new XMLHttpRequest();
    Http.open("GET", '/fetch_runs');
    Http.send();
    Http.onreadystatechange = (e) => {
        if (Http.readyState == 4 && Http.status == 200) {
            let res = JSON.parse(Http.responseText)
            if (res.length === 0)
                return 
            let options = res.data.split('||')
            past_row_runs = res.rows
            /* in case we are on ts.html */
            try { 
                var select = document.getElementById("past_runs"); 
                select.innerHTML = "";
                for(var i = options.length - 2; i >= 0; i--) {
                    var opt = options[i];
                    var el = document.createElement("option");
                    el.textContent = opt;
                    el.value = res.rows[i].id;
                    select.appendChild(el);
                }
            } catch (e) {}
            if (cb != undefined)
                cb()
        }
    }
}

let counter = 0

function insert_specs_to_plot(elem, obj) {
    let specs = document.createElement('specs')
    // add extra system info 
    let text = []
    text["cpu"] = "CPU "
    text["kernel"] = "Kernel "
    text["ram"] = "Memory (MB) "
    text["os"] = "Operating System "
    //text["commit"] = "Commit hash: "
    text["name"] = "Benchmark Type "
    text["hostname"] = "Hostname "
    obj.specs.name = obj.name
    let out = '<a href=https://github.com/andromeda/pash/commit/' + obj.commit + ' target="_blank">' + obj.commit + '</a><br>';
    specs.style.fontSize = "15px";
    specs.innerHTML = descriptions[obj.name] + "<br>" + out
    let table = document.createElement('table')
    table.style = "table-layout: fixed";
    for (let i in text) {
        var newRow = table.insertRow();
        let t = text[i]
        create_cell(newRow, t)
        create_cell(newRow, obj.specs[i])
    }
    elem.appendChild(specs);
    elem.appendChild(table)
}

/*
 * Draw the actual barplot.
 * obj is the input data required
 */
function draw_svg(obj, pos) {
    let margin = {top: 100, right: 5, bottom: 35, left: 95}
    let width = 750 - margin.left - margin.right
    let height = 400 - margin.top - margin.bottom;

    // for fit reasons
    obj.csv = obj.csv.replaceAll('pash_', '');
    // create the plot container 
    var container                                     
    if (pos === undefined) {
        container = document.createElement("SECTION");
    } else {
        container = document.getElementById(pos);
    }
    container.id = "container";
    // create the right section
    var right = document.createElement('right');
    // insert the system specs
    //insert_specs_to_plot(right, obj)
    // create the output log with the toggle button
    var s = document.createElement('div')

    if (running_on_website === false) {
        let b = output_log_button(s)
        s.className = 'myBox'
        s.innerHTML = "<font size='1'>" + obj.csv.replaceAll('\n', '<br>') + "</font>"
        right.appendChild(b)
        right.appendChild(s);
    }
    // set the dimensions and margins of the graph
    let left = document.createElement('left')
    let name = 'chart' + counter
    let elem = document.createElement(name)
    // append the elements to the respective section
    left.appendChild(elem)
    container.appendChild(left)
    //container.appendChild(desc)
    container.appendChild(right)
    //document.body.appendChild(container)
    if (pos === undefined) {
        document.body.appendChild(container);
    } else {
        container.appendChild(left);
    }
    elem.id  = 'chart' + counter;
    let data = d3.csvParse(obj.csv)
    // append the svg object to the body of the page
    var svg = d3.select(name)
        .append("svg")
        .attr("width", width + margin.left /1.5)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left/1.53 + "," + margin.top + ")");
    svg.attr("viewBox", [0, 0, width, height]);
    svg.attr("preserveAspectRatio", "xMinYMin");

    svg.append('rect')
    // this is for svg export
        .attr("x", -margin.left)
        .attr("y", -margin.top)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom )
        .attr('fill', 'white')
    // List of subgroups = header of the csv files = soil condition here
    var subgroups = data.columns.slice(1)
    // List of groups = species here = value of the first column called group -> I show them on the X axis
    var groups = d3.map(data, function(d){return(d.group)}).keys()
    // calculate the upper limit
    let upper_plot_limit = 0.0;
    data.forEach(function(d) {
        for (let i in d) {
            let n = parseFloat(d[i])
            if (isNaN(n) === false) {
                if (n > upper_plot_limit) {
                    upper_plot_limit = n;
                }
            }
        }
    });
    // give some space to the plot to breathe
    upper_plot_limit = upper_plot_limit * 1.2
    // Add X axis
    var x = d3.scaleBand()
        .domain(groups)
        .range([0, width])
        .padding([0.2])
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).tickSize(0))
        .selectAll("text")
        .attr("transform", "rotate(-25)")
        .style("text-anchor", "end")
        .attr("font-size", "10px")
    // Add Y axis
    var y = d3.scaleLinear()
        .domain([0, upper_plot_limit])
        .range([height, 0]);
    svg.append("g")
        .call(d3.axisLeft(y));
    // Another scale for subgroup position?
    var xSubgroup = d3.scaleBand()
        .domain(subgroups)
        .range([0, x.bandwidth()])
        .padding([0.05])
    var colors = ['#e41a1c','#377eb8','#4daf4a', "#6e40aa","#bf3caf","#fe4b83", 
            "#ff7847","#e2b72f","#aff05b","#52f667","#1ddfa3","#23abd8","#4c6edb",
            "#6e40aa"]

    // color palette = one color per subgroup
    var color = d3.scaleOrdinal()
        .domain(subgroups)
        .range(colors)
    // Show the bars
    svg.append("g")
        .selectAll("g")
    // Enter in data = loop group per group
        .data(data)
        .enter()
        .append("g")
        .attr("transform", function(d) {return "translate(" + x(d.group) + ",0)"; })
        .selectAll("rect")
        .data(function(d) {return subgroups.map(function(key) {return {key: key, value: d[key]}; }); })
        .enter().append("rect")
        .attr("x", function(d) { return xSubgroup(d.key); })
        .attr("y", function(d) { return y(d.value); })
        .attr("width", xSubgroup.bandwidth())
        .attr("height", function(d) { return height - y(d.value); })
        .attr("fill", function(d) { return color(d.key); });

    svg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left/2)
        .attr("x", -height / 2 + margin.bottom)
        .text("Execution Time (s)")
        .style("font-size", "12px")

    if (running_on_website === false) {
        // Define the benchmark name
        svg.append("text")
            .attr("text-anchor", "end")
            .attr("y", 0)
            .style('font-size', 20)
            .attr("x", width/2)
            .text(obj.name)
    }
    // Handmade legend
    let labels = obj.csv.split('\n')[0].split(',')
    labels.shift()
    // CREATE LEGEND // 
    // Removing rotate(90) restores the legend
    var svgLegend = svg.append('g')
        .attr('class', 'gLegend')
        .attr("transform", "translate(" + (width ) + "," + 0 + ") rotate(90)")
    //legend marker
    var R = 8 
    var legend = svgLegend.selectAll('.legend')
        .data(labels)
        .enter().append('g')
        .attr("class", "legend")
        .attr("transform", 
            /* legend placement */
            function (d, i) { 
                let res = fetch_item_pos(i, width, margin.left)
                return "translate("+ res.y + "," + res.x + ")"
            })
    legend.append("circle")
        .attr("class", "legend-node")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", R)
        .style("fill", d=>color(d))

    legend.append("text")
        .attr("class", "legend-text")
        .attr("x", R*2)
        .attr("y", R/2)
        .attr("transform", "rotate(-90)")
        .style("fill", "black")
        .style("font-size", 12)
        .text(d=>d)
    // add the description to the plot
    //let desc = document.createElement('desc')
    //desc.style.fontSize = "15px";
    //desc.innerHTML = descriptions[obj.name] + "<br>"
    //right.appendChild(desc)
    if (running_on_website === false) {
        elem.appendChild(linebreak);
        /* add button to download the plot */
        let download_button = document.createElement('button');
        download_button.innerHTML = 'Download Plot'
        download_button.id = counter
        download_button.onclick = function() {
            download_svg(download_button.id);
        }
        right.appendChild(download_button)
    }
    counter++
}

function d(s) {
    let plot_data='id,date,hash,script,time,conf'
    for (let k in s) {
        let csv = s[k].csv
        // fetch the labels
        let labels = csv.split('\n')[0].split(',')
        csv = csv.toString().split('\n')
        csv.shift();
        for (let i = 1; i <  labels.length; i++) {
            for (let j in csv) {
                let line = csv[j].split(',')
                if (isNaN(line[i]) == false) {
                    plot_data+='\n' + s[k].id + ',' + s[k].date + ',' + s[k].commit +',' 
                    plot_data+=line[0] + ',' + line[i]+ ',' + labels[i]
                }
            }
        }
    }
    return plot_data
}

function draw_timeseries_plots(branch, benchmarks) {
    let arr = {}
    // iterate all the benchmarks (CORRECTNESS/PERFORMANCE)
    let item_count = past_row_runs.length;
    // render the last 20 entries
    for (let i = 0; i < item_count; i++) {
        let en = past_row_runs[i]
        if (en.branch === branch && en.bench === benchmarks) {
            if (arr[en.bench] == undefined) {
                arr[en.bench] = []
            }
            arr[en.bench].push(en)
        }
    }
    let bench_name = {}
    /* Iterate all benchmark types */
    for (let i in arr) {
        let tests = arr[i];
        /* fetch all entries in each benchmark */
        for (let j in tests) {
            let data ;
            /* deserialize the test results */
            data = JSON.parse(tests[j].tests);
            for (let k in data) {
                data[k].commit = tests[j].commit;
                data[k].date = tests[j].date;
                data[k].id = tests[j].id;
                if (bench_name[data[k].name] == undefined) 
                    bench_name[data[k].name] = [];
                let val = contain_dub(bench_name[data[k].name], data[k])
                if (bench_name[data[k].name] != undefined && val == true)
                    bench_name[data[k].name].push(data[k]);
            }
        }
    }
    // draw the actual plots
    for (let i in bench_name) {
        let entry = d(bench_name[i])
        draw_timeseries(i, entry)
    }
    return 
}

function contain_dub(a,b){
    let item =  a
        for (let kk in item) {
            if (item[kk].commit == b.commit)
                return false
        }
    return true
}

/*
 * Function that saves a plot as svg
 * d: the index of the plot
 */
function download_svg(d) {
    let name = 'plot.svg'
    let svg = document.getElementById('chart' + d)
    svg = svg.childNodes[0]
    var svgData = svg.outerHTML;
    var preface = '<?xml version="1.0" standalone="no"?>\r\n';
    var svgBlob = new Blob([preface, svgData], {type:"image/svg+xml;charset=utf-8"});
    var svgUrl = URL.createObjectURL(svgBlob);
    var downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = name;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

function fetch_id(svg) {
    return svg.select("ts_unique_id").attr("uid")
}

function compare( a, b ) {
    if ( a.id < b.id ){
        return -1;
    }
    if ( a.id > b.id ){
        return 1;
    }
    return 0;
}

function draw_timeseries(bench_name, d) {
    //trick to shrink the input size 
    d = d.replaceAll('PaSh_daemon', 'PD');
    d = d.replaceAll('pash_', '');
    // extract the data
    let data = d3.csvParse(d);
    let res = data.map((d,i) => {
        return {
            id : parseInt(d.id),
            date: d.date,
            hash: d.hash,
            script : d.script,
            time : parseFloat(d.time).toFixed(4),
            conf : d.conf
        }
    })
    // we need to sort everything Based on the ID feature
    // each new commit has ID > previous_commit
    data.sort(compare)
    res.sort(compare)
    // find all the items on the csv based on increasing id 
    let groups = d3.map(data, function(d){return(d.id)}).keys()
    let margin = {top: 100, right: 5, bottom: 35, left: 95}
    let width = 750 - margin.left - margin.right
    let height = 400 - margin.top - margin.bottom;
    let chart
    /*
     * If we are running on the website, the respective div components already 
     * exist in the document. Fetch them!
     */
    if (running_on_website === true) {
        chart = document.getElementById(bench_name);
    } else {
        chart = document.createElement('div')
    }
    chart.id  = 'chart' + counter
    let  glines
    let  mouseG
    let  tooltip

    let  lineOpacity = 1
    let  lineStroke = "2px"
    let  axisPad = 12 // axis formatting
    let  R = 8 //legend marker
    let  colors = ["#2D4057", "#7C8DA4", "#B7433D", "#2E7576", "#EE811D", '#e41a1c','#377eb8','#4daf4a', "#6e40aa","#bf3caf","#fe4b83"]
    let  category = ["bash", "r_split2"]

    let bz = d3.extent(res, d=>d.id)
    // if we only have 1 benchmark, (max = min), we don't have to plot
    if (bz[0] == bz[1]) {
        let msg = "Need to perform more benchmarks for "+ bench_name
        console.log(msg);
        //alert(msg)
        //return 
    }
    if (running_on_website === true) {

    } else {
        // add the description to the plot
        let desc = document.createElement('description')
        desc.id = 'description'
        desc.innerHTML = descriptions[bench_name] + "<br>"
        document.body.appendChild(desc)
        // append the chart after the description
        document.body.appendChild(chart)
    }
    // get all the script names so we can toggle between them
    let script_names = d3.map(data, function(d){return(d.script)}).keys()
    script_names.sort()
    // get all the configuration so we can create legend/colors/tooltip
    let config_names = d3.map(data, function(d){return(d.conf)}).keys()
    let ids = d3.map(data, function(d){return d.id}).keys()
    let hashes = d3.map(data, function(d){return d.hash}).keys()
    let time_scale = d3.map(data, function(d){return d.time}).keys()
    // set colors len to config len so it doesn't mess up our plot -- they must have the same len 
    colors.length = config_names.length
    // parse the new colors
    let color = d3.scaleOrdinal()
        .domain(category)
        .range(colors)
    category = config_names
    let upper_time_limit = 0;
    for (let i = 0; i < time_scale.length; i++) {
        let num = parseFloat(time_scale[i])
        if (num > upper_time_limit) {
            upper_time_limit = num
        }
    }
    // set the y axis bounds
    let yScale = d3.scaleLinear()
        .domain([0, upper_time_limit * 1.2])
        .range([height, 0]);
    // FIXME
    /* corrects the and dimensions */
    let svg = d3.select("#" + chart.id).append("svg")
        .attr("width", width + margin.left/1.5)
        .attr("height", height + margin.top )
        .append('g')
    // *****
        .attr("transform", "translate(" + margin.left / 1.53 + "," + margin.top / 2+ ")");
    svg.attr("viewBox", [0, 0, width, height]);
    svg.attr("preserveAspectRatio", "xMinYMin");

    svg.append('rect')
    // this is for svg export
        .attr("x", -margin.left)
        .attr("y", -margin.top)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom )
        .attr('fill', 'white')

    // append a unique identifier for each plot 
    svg.append("ts_unique_id").attr("uid", counter)
    // CREATE tick lines on the Y axis
    let yAxis = d3.axisLeft(yScale).ticks(6, "s").tickSize(-width).tickFormat(d3.format(".1f")) //horizontal ticks across svg width
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .call(g => {
            // hide the ticks for now, we will redraw them later
            g.selectAll("text")
                .style("text-anchor", "middle")
                .attr("x", -axisPad*2)
                .attr("opacity", 0.0)

            g.selectAll("line")
                .attr('stroke', '#000000')
                .attr('stroke-width', 0.7) // make horizontal tick thinner and lighter so that line paths can stand out
                .attr('opacity', 0.2)
            g.select(".domain").remove()
        })
        .append('text')
        .attr("fill", "#000000")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left/2)
        .attr("x", -height / 2 + margin.bottom)
        .text("Execution Time (s)")
        .style("font-size", "12px")

    let xScale = d3.scalePoint()
    let xbd = xScale.bandwidth()
    xScale
        .domain(ids)
        .range([0, width])
    xScale.invert = function(x) {
        var domain = this.domain();
        var range = this.range()
        var scale = d3.scaleQuantize().domain(range).range(domain)
        return scale(x)
    }
    // Create X AXIS line
    let axis = d3.axisBottom(xScale)
        .tickFormat(function(d, i) {         
            return hashes[i]
        })

    let line = d3.line()
        .x(d => {let val = xScale(d.id) ; return val})
        .y(d => yScale(d.time))

    // Finally append the Y axis line
    svg.append("g")
        .call(d3.axisLeft(yScale));

    // Add the x Axis
    svg.append("g")
        //.attr("transform", "translate(0," + height + ")") 
        .attr("transform", "translate(" + 0 + ',' + height + ")") 
        .call(axis) 
        .selectAll("text")                                
        .attr("transform", "translate(" + 0 +"," + 0 + ") rotate(-25)") 
        .style("text-anchor", "end")                      
        .attr("font-size", "10px")                        

    // Append X axis label
    svg.append('g')
        .append('text')
        .attr('x', width / 2)
        .attr("y", height + 45)
        .attr("fill", "#000000")
        .text("Commit ID")
    // CREATE LEGEND // 
    // Removing rotate(90) restores the legend
    let svgLegend = svg.append('g')
        .attr('class', 'gLegend')
        .attr("transform", "translate(" + (width ) + "," + 0 + ") rotate(90)")

   let legend = svgLegend.selectAll('.legend')
        .data(category)
        .enter().append('g')
        .attr("class", "legend")
        .attr("transform", 
            /* legend placement */
            function (d, i) { 
                let res = fetch_item_pos(i, width, margin.left)
                return "translate("+ res.y + "," + res.x + ")"
            })
    legend.append("circle")
        .attr("class", "legend-node")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", R)
        .style("fill", d=>color(d))
    legend.append("text")
        .attr("class", "legend-text")
        .attr("x", R*2)
        .attr("y", R/2)
        .attr("transform", "rotate(-90)")
        .style("fill", "black")
        .style("font-size", 12)
        .text(d=>d)
    if (running_on_website === false) {
        // Define the benchmark name
        svg.append("text")
            .attr("text-anchor", "end")
            .attr("y", 0)
            .style('font-size', 20)
            .attr("x", width/2)
            .text(bench_name)
    }
    chart.appendChild(linebreak);
    // add button to download the plot 
    let download_button = document.createElement('LABEL');
    download_button.innerHTML = '<a>Save plot</a>'
    download_button.id = counter
    download_button.onclick = function() {
        download_svg(download_button.id);
    }

    // add the toggle button to switch scripts
    let scripts = document.createElement('select');
    scripts.id = "opts" + counter
    scripts.name = 'scripts'
    scripts.name = "bidding_no"
    for (let i = 0; i < script_names.length; i++) {
        let anOption = document.createElement('option');
        // This is a bugfix to not mess sort builtin function
        if (script_names[i] === "sort_") {
            script_names[i] = "sort";
        }
        anOption.innerHTML = script_names[i];
        scripts.appendChild(anOption);
    }
    if (running_on_website === true) {
        chart.appendChild(scripts);
        chart.appendChild(download_button);
    } else {
        document.body.appendChild(scripts);
        document.body.appendChild(download_button);
    }
    renderChart(script_names[0]) // inital chart render (set default to Bidding Exercise 1 data)
    // Update the chart when we change script
    d3.select('#' + scripts.id).on('change', function(){
        updateChart(this.value)
    })
    function updateChart(script) {
        let resNew = res.filter(d=>d.script == script)
        let res_nested = d3.nest()
            .key(d=>d.conf)
            .entries(resNew)
        glines.select('.line') 
            .data(res_nested)
            .transition().duration(750)
            .attr('d', function(d) {
                return line(d.values)
            })
        mouseG.selectAll('.mouse-per-line' + fetch_id(svg))
            .data(res_nested)
        mouseG.on('mousemove', function () { 
            let mouse = d3.mouse(this)
            updateTooltipContent(mouse, res_nested)
        })
    }

    function renderChart(script) {
        let resNew = res.filter(d=>d.script == script)
        let res_nested = d3.nest() // necessary to nest data so that keys represent each vehicle category
            .key(d=>d.conf)
            .entries(resNew)
        // APPEND MULTIPLE LINES //
        let lines = svg.append('g')
            .attr('class', 'lines')

        glines = lines.selectAll('.line-group' + fetch_id(svg))
            .data(res_nested).enter()
            .append('g')
            .attr('class', 'line-group' + fetch_id(svg))
        glines  
            .append('path')
            .attr('class', 'line')  
            .attr('d', d => line(d.values))
            .style('stroke', (d, i) => color(i))
            .style('fill', 'none')
            .style('opacity', lineOpacity)
            .style('stroke-width', lineStroke)
        // CREATE HOVER TOOLTIP WITH VERTICAL LINE //
        tooltip = d3.select("#" + chart.id).append("div")
            .attr('id', 'tooltip' + fetch_id(svg))
            .style('position', 'absolute')
            .style("background-color", "#D3D3D3")
            .style('padding', 6)
            .style('display', 'none')
        mouseG = svg.append("g")
            .attr("class", "mouse-over-effects" + fetch_id(svg));
        mouseG.append("path") // create vertical line to follow mouse
            .attr("class", "mouse-line" + fetch_id(svg))
            .style("stroke", "#000000")
            .style("stroke-width", lineStroke)
            .style("opacity", "0");
        let mousePerLine = mouseG.selectAll('.mouse-per-line' + fetch_id(svg))
            .data(res_nested)
            .enter()
            .append("g")
            .attr("class", "mouse-per-line" + fetch_id(svg));
        mousePerLine.append("circle")
            .attr("r", 4)
            .style("stroke", function (d) {
                return color(d.key)
            })
            .style("fill", "none")
            .style("stroke-width", lineStroke)
            .style("opacity", "0");
        mouseG.append('svg:rect') // append a rect to catch mouse movements on canvas
            .attr('width', width) 
            .attr('height', height)
            .attr('fill', 'none')
            .attr('pointer-events', 'all')
            .on('mouseout', function () { // on mouse out hide line, circles and text
                d3.select(".mouse-line" + fetch_id(svg))
                    .style("opacity", "0");
                d3.selectAll(".mouse-per-line"+fetch_id(svg) +" circle")
                    .style("opacity", "0");
                d3.selectAll(".mouse-per-line"+fetch_id(svg) +" text")
                    .style("opacity", "0");
                d3.selectAll("#tooltip" + fetch_id(svg))
                    .style('display', 'none')
            })
            .on('mouseover', function () { // on mouse in show line, circles and text
                d3.select(".mouse-line" + fetch_id(svg))
                    .style("opacity", "1");
                d3.selectAll(".mouse-per-line"+fetch_id(svg) +" circle")
                    .style("opacity", "1");
                d3.selectAll("#tooltip" + fetch_id(svg))
                    .style('display', 'block')
            })
            .on('mousemove', function () { // update tooltip content, line, circles and text when mouse moves
                var mouse = d3.mouse(this) // detect coordinates of mouse position within svg rectangle created within mouseG
                d3.selectAll(".mouse-per-line" + fetch_id(svg))
                  .attr("transform", function (d, i) {
                    var xDate = xScale.invert(mouse[0]) // None of d3's ordinal (band/point) scales have the 'invert' method to to get date corresponding to distance of mouse position relative to svg, so have to create my own method
                    var bisect = d3.bisector(function (d) { return d.id }).left // retrieve row index of date on parsed csv
                    var idx = bisect(d.values, xDate)
                    d3.select(".mouse-line"  + fetch_id(svg))
                      .attr("d", function () {
                        var data = "M" + (/*xbd +*/ xScale(d.values[idx].id)) + "," + (height);
                        data += " " + (/*xbd +*/ xScale(d.values[idx].id))  + "," + 0;
                        return data;
                      });
                    let valx = xScale(d.values[idx].id) //+ xbd
                    return "translate(" + valx + "," + yScale(d.values[idx].time) + ")";
                  });
                updateTooltipContent(mouse, res_nested)
              })
          }

    function updateTooltipContent(mouse, res_nested) {
        let sortingObj = []
        res_nested.map(d => {
          var xDate = xScale.invert(mouse[0])
          var bisect = d3.bisector(function (d) { return d.id }).left
          var idx = bisect(d.values, xDate)
            sortingObj.push({key: d.values[idx].conf, time: d.values[idx].time, script: d.values[idx].script, date:d.values[idx].date,id: d.values[idx].id, hash:d.values[idx].hash})
        })

        sortingObj.sort(function(x, y){
            return d3.ascending(x.key, y.key);
        })

        let sortingArr = sortingObj.map(d=> d.key)

        let res_nested1 = res_nested.slice().sort(function(a, b){
            return sortingArr.indexOf(a.key) - sortingArr.indexOf(b.key) 
        })
        tooltip.html("Commit: <b>" +  sortingObj[0].hash + "</b><br>ID: <b>" + 
                sortingObj[0].id + "</b><br>Script: <b>" + sortingObj[0].script + 
                "</b><br>Date: <b>" +  sortingObj[0].date + "</b>")
            .style('display', 'block')
            .style('font-size', 20)
            .style('left', d3.event.pageX + 50)
            .style('top',  d3.event.pageY - 170)
            .selectAll()
            .data(res_nested1).enter() 
            .append('div')
            .style('color', d => {
                return color(d.key)
            })
            .style('font-size', 20)
            .html(d => {
                var xDate = xScale.invert(mouse[0])
                var bisect = d3.bisector(function (d) { return d.id }).left
                var idx = bisect(d.values, xDate)

                return d.key + ": "+ d.values[idx].time.toString() + "s"
            })
    }
    counter++
    chart.appendChild(linebreak);
}

/*
 * on each date change, we search all the fetched executions and filter them based
 * on the date we picked
 */
function filter_runs(event) {
    let value = event.value
    let values = value.split('-')
    let year = parseInt(values[0])
    let month = parseInt(values[1])
    let day = parseInt(values[2])
    var select = document.getElementById("past_runs");
    select.innerHTML = "";
    for (let j in past_row_runs) {
        let r = past_row_runs[j]
        let v = r.date.split('-')
        let vy = parseInt(v[0])
        let vm = parseInt(v[1])
        let vd = parseInt(v[2])
        /* append the new elements to the combobox */
        if (vy == year && vm == month && vd == day) {
            var el = document.createElement("option");
            el.textContent = r.date + ';' + r.time +' ' + r.commit + ' ' + r.msg;
            el.value = r.id
            select.appendChild(el);
        }
    }
}

var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = sParam,
        sURLVariables = sPageURL.split('&'),
        sParameterName = []
    for (let i = 0; i < sURLVariables.length; i++)
        sParameterName[i] = sURLVariables[i].split('=');
    return sParameterName
}

/*
 * Callback function issued in case we are passing url arguments to the app (e.g CLI)
 */
function curl_callback() {
    let rq = window.location.href.split('/')[3]
    rq = getUrlParameter(rq)
    if (rq != undefined && rq[0][0] === "data") {
        let entries = rq[0][1].split(',')
        let data 
        if (entries[entries.length-1] === "")
            entries.pop()
        /* iterate all the arguments and start drawing their barplots */
        for (let j in entries) {
            data = draw_barplot_by_id(entries[j])
            if (data == undefined) {
                let msg = "Entry:" + entries[j] + " does not exist!\nReload your page or remove the url arguments\n";
                alert(msg);
                return 
            }
        }
        /* 
         * from the last entry that we plotted, we use it as index for its timeseries
         * We should not mix different kind of benchmarks for plots, even though its supported
         */
        draw_timeseries_plots(data.branch, data.bench)
    }
}

function current_task() {
    fetch_current_task()
    setTimeout(current_task, 60000);
}

function draw_all_ts() {
    if (running_on_website === false) {
        draw_timeseries_plots('future', "TIGHT-LOOP");
    }
    draw_timeseries_plots('main', "PERFORMANCE"); 
}

function fetch_dynamically() {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    today = yyyy + '-' + mm + '-' + dd
        try {
            document.getElementById("myDate").value = today
                current_task();
        } catch(e){}
    // load the page here with its dynamic content 
    // after it has been loaded, call the callback in case we have url arguments
    let rq = window.location.href.split('/')[3]
    rq = getUrlParameter(rq)
    let cb = curl_callback
    if (rq !== undefined && rq[0][0].includes("ts")) {
        cb = draw_all_ts
    } else {
        load_workers()
    }
    fetch_runs()
    load_page(cb)
}


function fetch_manually(data) {
    data = JSON.parse(data)
	past_row_runs = data.rows
    // draw the actual plots
	draw_all_ts()
    //draw_barplot_by_type('CORRECTNESS', "COMPILER", 'compiler-bp')
    draw_barplot_by_type('PERFORMANCE', "Classics", "Classics-bp")
    draw_barplot_by_type('PERFORMANCE', "Unix50", 'Unix50-bp')
    draw_barplot_by_type('PERFORMANCE', "COVID-mts", 'COVID-mts-bp')
}

window.onload = function () {
    if (running_on_website === false) {
        fetch_dynamically();
    } else {
        fetch_manually(local_data);
    }
}

var Base64 = {
    // private property
    _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

    // public method for encoding
    encode : function (input) {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;

        input = Base64._utf8_encode(input);

        while (i < input.length) {

            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            output = output +
                Base64._keyStr.charAt(enc1) + Base64._keyStr.charAt(enc2) +
                Base64._keyStr.charAt(enc3) + Base64._keyStr.charAt(enc4);

        }

        return output;
    },

    // public method for decoding
    decode : function (input) {
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;

        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

        while (i < input.length) {

            enc1 = Base64._keyStr.indexOf(input.charAt(i++));
            enc2 = Base64._keyStr.indexOf(input.charAt(i++));
            enc3 = Base64._keyStr.indexOf(input.charAt(i++));
            enc4 = Base64._keyStr.indexOf(input.charAt(i++));

            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;

            output = output + String.fromCharCode(chr1);

            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }

        }

        output = Base64._utf8_decode(output);

        return output;

    },

    // private method for UTF-8 encoding
    _utf8_encode : function (string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";

        for (var n = 0; n < string.length; n++) {

            var c = string.charCodeAt(n);

            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }

        return utftext;
    },

    // private method for UTF-8 decoding
    _utf8_decode : function (utftext) {
        var string = "";
        var i = 0;
        var c = 0
            let c1 =0
            let c2 = 0;
        let c3 = 0
            while ( i < utftext.length ) {

                c = utftext.charCodeAt(i);

                if (c < 128) {
                    string += String.fromCharCode(c);
                    i++;
                }
                else if((c > 191) && (c < 224)) {
                    c2 = utftext.charCodeAt(i+1);
                    string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                    i += 2;
                }
                else {
                    c2 = utftext.charCodeAt(i+1);
                    c3 = utftext.charCodeAt(i+2);
                    string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                    i += 3;
                }

            }
        return string;
    }
}

function draw_barplot_by_type(type, name, pos) {
    let obj = undefined
    for (let i in past_row_runs) {
        if (obj !== undefined)
            break;
        let item = past_row_runs[i];
        if (item.bench === type) {
        if (obj !== undefined)
            break;
            let v = JSON.parse(item.tests)
            for (let j in v) {
                if (v[j].name === name) { 
                    v[j].specs = item.specs
                    v[j].commit = item.commit
                    v[j].msg = item.commit_msg
                    obj = v[j]
                    break;
                }
            }
        }
    }
    //let obj = past_row_runs.filter(obj => obj.bench == type);
    // the current id does not exist
    if (obj === undefined)
        return undefined;
    // get last element
    draw_svg(obj, pos);
}
local_data = Base64.decode(`PGh0bWw+DSA8aGVhZD48dGl0bGU+NTA0IEdhdGV3YXkgVGltZS1vdXQ8L3RpdGxlPjwvaGVhZD4NIDxib2R5Pg0gPGNlbnRlcj48aDE+NTA0IEdhdGV3YXkgVGltZS1vdXQ8L2gxPjwvY2VudGVyPg0gPGhyPjxjZW50ZXI+bmdpbngvMS4xNi4xPC9jZW50ZXI+DSA8L2JvZHk+DSA8L2h0bWw+DQo=`);
running_on_website = true;
