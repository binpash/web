USER=binpash
REPO=pash
curl https://api.github.com/repos/$USER/$REPO/issues > issues.txt
node extract_issues.js > final.txt
rm issues.txt
