let found = false;
for (let i in v) {
    for (let j in v[i]) 
        if (v[i][j].bench === "POSIX") {
            let o = v[i][j].tests;
            let o2 = JSON.parse(o)[0].csv.toString();
            let obj = o2.split('\n');
            let total = 0;
            for (let k = 1; k < obj.length; k++) {
                let o3 = obj[k].split(',');
                if (found === true) 
                    process.exit(0);
                for (let x=0; x < 8;x++) {
                    if (x === 0) {
                        if (o3[0] !== process.argv[2]) {
                            break;
                        }
                        found = true;
                        o3[0] = o3[0].toUpperCase();
                        console.log(o3[0], "Tests </td>");
                        continue;
                    }
                    if (x === 1) {
                        total = o3[1];
                        continue;
                    }
                    console.log("<td> " + o3[x] + '/' + total + "</td>"); 
                }
            }
        }
}
