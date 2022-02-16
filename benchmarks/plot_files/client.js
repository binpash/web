'use strict';
/*
 * Placement functionality for the legend generatior for performance 
 * and correctness tests
 */
let y_pos = []
y_pos[0] = 15
y_pos[1] = 35
let x_pos = []
x_pos[0] = function(a, width, right) {return width - right/4 - a * 125}
x_pos[1] = function(a, width, right) {return width - right/4 - a * 125}

/*
 * Return the position of a legend entry 
 * i: the index of the current object
 * width: the width of the plot
 * right: the margin right value of the plot
 */
function fetch_item_pos(i, width, right) {
    let res = {}
    res.y = y_pos[0]
    res.x = x_pos[0](i, width, right)
    if (i > 4) {
        res.y = y_pos[1]
            res.x = x_pos[0](i%5, width, right)
    }
    return res
}

let linebreak = document.createElement("br");

let dataset_size = {}
dataset_size['unix50'] = '1G (each test) '
dataset_size['oneliners'] = '10M-3G'
dataset_size['analytics-mts'] = '3.4G'

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

function draw_barplot_by_type(type, name, pos) {
    let obj = past_row_runs.filter(obj => obj.bench == type);
    // the current id does not exist
    if (obj == undefined)
        return undefined;
    // get last element
    obj = obj[obj.length - 1]
    // fetch all the tests from an entry and plot them
    let tests = JSON.parse(obj.tests);
    for (let i in tests) {
        if (tests[i].name === name) {
            // append to the right section of the section
            let test = tests[i];
            test.name = name
            test.specs = obj.specs;
            test.commit = obj.commit;
            test.msg = obj.commit_msg;
            draw_svg(test, pos);
            break;
        }
    }
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
    obj.specs.name = obj.name.toLowerCase();
    let out = '<a href=https://github.com/andromeda/pash/commit/' + obj.commit + ' target="_blank">' + obj.commit + '</a><br>';
    let table = document.createElement('table')
    table.style = "table-layout: fixed";
    for (let i in text) {
        var newRow = table.insertRow();
        let t = text[i]
        create_cell(newRow, t)
        create_cell(newRow, obj.specs[i])
    }
    //elem.appendChild(specs);
    elem.appendChild(table)
}

/*
 * Draw the actual barplot.
 * obj is the input data required
 */
function draw_svg(obj, pos) {
    let margin = {top: 30, right: 5, bottom: 50, left: 60},
        width = 750 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;
    // create the plot container 
    var container = document.getElementById(pos);
    // insert the system specs
    //insert_specs_to_plot(container, obj)
    // create the output log with the toggle button
    // set the dimensions and margins of the graph
    let left = document.createElement('left')
    let name = 'chart' + counter
    let elem = document.createElement(name)
    // append the elements to the respective section
    left.appendChild(elem)
    container.appendChild(left)
    //container.appendChild(desc)
    //document.body.appendChild(container)
    elem.id  = 'chart' + counter   
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
        .domain([0, obj.bn * 1.2])
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
        .attr("transform", function(d) { return "translate(" + x(d.group) + ",0)"; })
        .selectAll("rect")
        .data(function(d) { return subgroups.map(function(key) { return {key: key, value: d[key]}; }); })
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
    elem.appendChild(linebreak);
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

let data_table = {}

function load_timeseries_data(branch, benchmarks) {
    let arr = {}
    /* iterate all the benchmarks (CORRECTNESS/PERFORMANCE) */
    for (let i in past_row_runs) {
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
                if (bench_name[data[k].name] != undefined && val == false)
                    bench_name[data[k].name].push(data[k]);
            }
        }
    }
    // draw the actual plots
    for (let i in bench_name) {
        data_table[i] = d(bench_name[i])
    }
    return 
}

function contain_dub(a,b){
    let item =  a
        for (let kk in item) {
            if (item[kk].commit == b.commit)
                return true
        }
    return false
}



async function draw_ts() {
    var branch = document.getElementById("branches").value;
    var benchmarks = document.getElementById("benchmarks").value;
    load_timeseries_data(branch, benchmarks)
}

/*
 * Function that saves a plot as svg
 * d: the index of the plot
 */
function download_svg(d) {
    let name = 'plot.svg'
    let svg = document.getElementById(d)
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

function draw_timeseries(bench_name, d) {
    // this here arranges the x range 

    // extract the data
    let data = d3.csvParse(d);
    let res = data.map((d,i) => {
        return {
            id : parseInt(d.id),
            date: d.date,
            hash: d.hash,
            script : d.script,
            time : parseFloat(d.time),
            conf : d.conf
        }
    })
    // find all the items on the csv based on increasing id 
    let groups = d3.map(data, function(d){return(d.id)}).keys() 
    let margin = {top: 40, right: 5, bottom: 35, left: 95}
    let width = 750  - margin.left - margin.right
    let height = 400 - margin.top - margin.bottom;

    let chart = document.getElementById(bench_name)
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

    let b = d3.extent(res, d=>d.id)
    /* if we only have 1 benchmark, (max = min), we don't have to plot */
    if (b[0] == b[1]) {
        let msg = "Need to perform more benchmarks for "+ bench_name
        alert(msg)
        return 
    }
    // get all the script names so we can toggle between them
    let script_names = d3.map(data, function(d){return(d.script)}).keys()
    script_names.sort()
    // get all the configuration so we can create legend/colors/tooltip
    let config_names = d3.map(data, function(d){return(d.conf)}).keys()
    
    let ids = d3.map(data, function(d){return d.id}).keys()
    let hashes = d3.map(data, function(d){return d.hash}).keys()
    // set colors len to config len so it doesn't mess up our plot -- they must have the same len 
    colors.length = config_names.length
    // parse the new colors
    let color = d3.scaleOrdinal()
        .domain(category)
        .range(colors)
    category = config_names
    // this here arranges the x range 
 
    let time_scale = d3.extent(res, d=>d.time)
    // set lower bound as 0
    time_scale[0] = 0;
    // set the y axis bounds
    let yScale = d3.scaleLinear()
        .domain([time_scale[0], time_scale[1] * 1.2])
        .range([height, 0]);
    // FIXME
    /* corrects the and dimensions */
    let svg = d3.select("#" + chart.id).append("svg")
        .attr("width", width + margin.left/1.5)
        .attr("height", height + margin.top )
        .append('g')
    // *****
        .attr("transform", "translate(" + margin.left / 1.53 + "," + (margin.top / 6) + ")");
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
    // CREATE AXIS
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

        let xScale = d3.scaleBand() ;
        xScale
            .domain(res.map(d=>d.id))
            .range([0, width]);
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
        .x(d => {let val = xScale(d.id) *2; return val;})
        .y(d => yScale(d.time))

     // Finally append the Y axis line
    svg.append("g")                  
        .call(d3.axisLeft(yScale));  

    svg.append("g")                                       
        .attr("transform", "translate(0," + height + ")") 
        .call(axis)                                       
        .selectAll("text")                                
        .attr("transform", "rotate(-25)")                 
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

    // Add white background to the legend, so it doesn't interract with the columns
    svgLegend.append('rect')
        .attr('fill', 'white')
        .attr("width", 30)
        .attr("height", 750)
        .attr("y", -50)
        .attr("x", -35)

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


    chart.appendChild(linebreak);
    // Create the right div for each plot
    // add button to download the plot 
    let system_specs = document.createElement('LABEL');
    system_specs.innerHTML =  ' 160x 2.27GHz E7-8860; Debian 4.9.0-14; ' + dataset_size[bench_name] + ' IN; '; 
    let download_button = document.createElement('LABEL');
    download_button.innerHTML = '<a>Save plot</a>'
    download_button.id = bench_name
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
        anOption.innerHTML = script_names[i]
        scripts.appendChild(anOption);
    }
    let selected_script = document.createElement('LABEL');
    selected_script.innerHTML = 'Benchmark:  '
    chart.appendChild(selected_script)
    chart.appendChild(scripts)
    chart.appendChild(system_specs)
    chart.appendChild(download_button)
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
                        var data = "M" + (xScale.bandwidth()/2 + xScale(d.values[idx].id)) + "," + (height);
                        data += " " + (xScale.bandwidth()/2 + xScale(d.values[idx].id))  + "," + 0;
                        return data;
                      });
                    let valx = xScale(d.values[idx].id) + xScale.bandwidth()/2
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
            return sortingArr.indexOf(a.key) - sortingArr.indexOf(b.key) // rank vehicle category based on price of time
        })
        tooltip.html("Commit: <b>" +  sortingObj[0].hash + "</b><br>ID: <b>" + 
                sortingObj[0].id + "</b><br>Script: <b>" + sortingObj[0].script + 
                "</b><br>Date: <b>" +  sortingObj[0].date + "</b>")
            .style('display', 'block')
            .style('font-size', 20)

            .style('transform', `translate(${d3.event.layerX - 50}px, ${d3.event.layerY - 340}px)`)
            //.style('left', d3.event.pageX + 50)
            //.style('top',  d3.event.pageY - 170)
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

function draw_all_ts() {
    load_timeseries_data('main', "PERFORMANCE");
    load_timeseries_data('main', "CORRECTNESS");
}

window.onload = function () {
    data = JSON.parse(data)
	past_row_runs = data
    // draw the actual plots
	draw_all_ts()
	draw_timeseries('unix50', data_table['unix50'])
	draw_timeseries('analytics-mts', data_table['analytics-mts'])
	draw_timeseries('oneliners', data_table['oneliners'])
    //draw_barplot_by_type('CORRECTNESS', "COMPILER", 'compiler-bp')
    draw_barplot_by_type('PERFORMANCE', "oneliners", 'oneliners-bp')
    draw_barplot_by_type('PERFORMANCE', "unix50", 'unix50-bp')
    draw_barplot_by_type('PERFORMANCE', "analytics-mts", 'analytics-bp')
}

function create_cell(newRow, a) {
    var newCell = newRow.insertCell();
    var newText = document.createTextNode(a);
    newCell.appendChild(newText);
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
