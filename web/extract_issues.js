'use strict';

const fs = require('fs');
let rawdata = fs.readFileSync('issues.txt');
let issues = JSON.parse(rawdata);
for (let i in issues) {
    // we fetch issue
    if (issues[i].pull_request === undefined) 
        console.log(issues[i].number, issues[i].title)
}
