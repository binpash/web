#!/bin/bash
set -e
# nice getopts template:
# http://stackoverflow.com/a/10789394

if [[ -z "$PASH_TOP" ]]; then
    echo "Need to provide PASH_TOP"
    exit 1
fi

arg0=$(basename $0.sh)

function usage {
    echo "Usage: $arg0 [-hvp] [./directory]"
    exit 1
}

version=$(grep __version__ $PASH_TOP/compiler/config.py | awk '{print $3}' | sed 's/"//g' || echo '"version": "0.1"')
VERSION=${VERSION:-$(echo $version | sed "s/^.*\"version\":[ ]*\"\(.*\)\".*$/\1/")};
UPDATED=$(LANG=en_us_88591; date +'%R'; date +'%m/%d/%Y')

# cleanup
function cleanup {
    rm ./utils/inc.html
    rm ./utils/css.html
}

function commit-msg {
MSG=$(git log -1 --pretty=%B | head -n 1)
if [[ ${#MSG} -gt 50 ]]; then
    MSG="$(echo $MSG | cut -c 1-48).."   
fi
echo "$MSG"
}

function run_correctness_current_hash {
    commit=$1
    branch=main
    # fetch some of the latest results in case some other actions happened
    data=$(curl -s "ctrl.pash.ndr.md/job=fetch_runs&count=50");
    results=$(echo $data | jq '.rows | .[] | select((.commit=='\"$commit\"') and .bench=="CORRECTNESS")')
    if [ -z "$results" ]; then
        request="http://ctrl.pash.ndr.md/job=issue&branch=$branch&commit=$commit&benchmark=CORRECTNESS";
        # issue the request, silence output
        issue=$(curl -s "$request");
    fi
    # poll until we get the results
    while true; do
        # fetch some of the latest results in case some other actions happened
        data=$(curl -s "ctrl.pash.ndr.md/job=fetch_runs&count=50");
        results=$(echo $data | jq '.rows | .[] | select((.commit=='\"$commit\"') and .bench=="CORRECTNESS")');
        if [ ! -z "$results" ]; then
            # results are found
            break;
        fi
        sleep 240;
    done
    echo $data;
}

###
# Function to generate html
# $1: directory (e.g., hotos, hotcloud, ..)
# $2: extras to be *added* to the extras title section
###
function generate-html {
# get the md filename
filename=$(basename $1)
# get the directory $filename is stored
dir=$(dirname $1)
DIR=${dir:-"."}
CSSDIR="./" 
template=template.html
type=$(basename $dir)
if [[ "$type" = "docs" ]]; then
    export self_tab=$(cat <<-END
<a href="./tutorial/index.html">tutorial</a> /     
<a class="self" href="./index.html">docs</a> /
<a href="./benchmarks/index.html">benchmarks</a> / 
END
)
CSSDIR="../"
elif [[ "$type" = "tutorial" ]];  then
    export self_tab=$(cat <<-END
<a class="self" href="./index.html">tutorial</a> /
<a href="../index.html">docs</a>  /
<a href="../benchmarks/index.html">benchmarks</a> /
END
)
CSSDIR="../.."
elif [[ "$type" = "install" ]] || [[ "$type" = "contributing" ]]; then
CSSDIR="../.."
    export self_tab=$(cat <<-END
<a class="self" href="../tutorial/index.html">tutorial</a> /
<a href="../index.html">docs</a>  /
<a href="../benchmarks/index.html">benchmarks</a> /
END
)
elif [[ "$type" = "p_stats" ]] || [[ "$type" = "parser" ]]; then
CSSDIR="../.."
    export self_tab=$(cat <<-END
<a class="self" href="../../docs/tutorial/index.html">tutorial</a> /
<a href="../index.html">docs</a>  /
<a href="../benchmarks/index.html">benchmarks</a> /
END
)
elif [[ "$type" = "benchmarks" ]]; then
    CSSDIR="../.."
    # when building the evaluation/benchmarks/
    if grep -q 'evaluation' <<< "$DIR"; then
    export self_tab=$(cat <<-END
<a href="../../docs/tutorial/index.html">tutorial</a> /     
<a href="../../docs/index.html">docs</a>  /
<a class="self" href="../../docs/benchmarks/index.html">benchmarks</a> /
END
)
    else 
    export self_tab=$(cat <<-END
<a href="../tutorial/index.html">tutorial</a> /     
<a href="../index.html">docs</a>  /
<a class="self" href="../benchmarks/index.html">benchmarks</a> /
END
)
    wget ctrl.pash.ndr.md/client.js -O $DIR/client.js
    commit_hash=$(cd $DIR/;git rev-parse --short HEAD);
    # fetch the correctness tests
    curl_d=$(run_correctness_current_hash $commit_hash)
    echo "let v = $curl_d;" > d.js
    echo "" >> d.js
    cat fetch_table.js >> d.js
    compiler=$(node d.js Compiler "$commit_hash");
    interface="$(node d.js Interface "$commit_hash")";
    posix="$(node d.js Posix "$commit_hash")";
    intro="$(node d.js Intro "$commit_hash")";
    agg="$(node d.js Aggregator "$commit_hash")"; 
    curl_d=$(curl -s "ctrl.pash.ndr.md/job=fetch_runs&count=50&benchmark=PERFORMANCE");
    curl_data=$(echo $curl_d | base64 | tr -d "\n")
    echo "local_data = Base64.decode(\`$curl_data\`);" >> $DIR/client.js
    echo "running_on_website = true;" >> $DIR/client.js


    template="benchmarks.html"
fi
elif [[ "$type" = "annotations" ]] || [[ "$type" = "compiler" ]] || [[ "$type" = "runtime" ]]; then
    CSSDIR="../"
export self_tab=$(cat <<-END
<a href="../docs/tutorial/index.html">tutorial</a> /     
<a href="../docs/index.html">docs</a>  /
<a href="../docs/benchmarks/index.html">benchmarks</a> /
END
)
else
    export self_tab=$(cat <<-END
<a href="./docs/tutorial/index.html">tutorial</a> /     
<a href="./docs/index.html">docs</a>  /
<a href="./docs/benchmarks/index.html">benchmarks</a> /
END
)
bash fetch_issues.sh
export issue1=$(cat final.txt | head -n1 | awk ' {print $1}')
export issue1_text=$(cat final.txt | head -n1 | awk ' {print $2,$3,$4,$5,$6,$7,$8}')
export issue2=$(cat final.txt | head -n2 | tail -n 1 | awk ' {print $1}')
export issue2_text=$(cat final.txt | head -n2 | tail -n 1 | awk ' {print $2,$3,$4,$5,$6,$7,$8}')
export issue3=$(cat final.txt | head -n3 | tail -n 1 | awk ' {print $1}')
export issue3_text=$(cat final.txt | head -n3 | tail -n 1 | awk ' {print $2,$3,$4,$5,$6,$7,$8}')
export issue4=$(cat final.txt | head -n4 | tail -n 1 | awk ' {print $1}')
export issue4_text=$(cat final.txt | head -n4 | tail -n 1 | awk ' {print $2,$3,$4,$5,$6,$7,$8}')
rm -f final.txt
template="landing.html"
fi

generate-styles $CSSDIR
pandoc -s $DIR/$filename\
    --variable revision="$(cd $DIR/;git rev-parse --short HEAD)"\
    --variable version="$VERSION"\
    --variable more="${2}"\
    --variable msg="$(cd $DIR/;commit-msg)"\
    --variable where="$DIR"\
    --variable pash_logo="$CSSDIR/utils/img/pash_logo2.jpg"\
    --variable title="PaSh: Light-touch Data-Parallel Shell Scripting"\
    --variable self_page="$self_tab"\
    --variable issue1="$issue1"\
    --variable issue1_text="$issue1_text"\
    --variable issue2="$issue2"\
    --variable issue2_text="$issue2_text"\
    --variable issue3="$issue3"\
    --variable issue3_text="$issue3_text"\
    --variable issue4="$issue4"\
    --variable issue4_text="$issue4_text"\
    --variable posix="$posix"\
    --variable interface="$interface"\
    --variable compiler="$compiler"\
    --variable intro="$intro"\
    --variable agg="$agg"\
    --variable UPDATED="$UPDATED"\
    --to=html5\
    --default-image-extension=svg\
    --template=./utils/$template\
    --highlight-style=pygments\
    --section-divs\
    --toc\
    --css="$CSSDIR"/utils/css/main.css\
    --filter pandoc-citeproc\
    --include-in-header=./utils/css.html\
    --include-after-body=./utils/inc.html\
    -o $DIR/index.html

  # fix the huge title
  if [[ "$type" = "docs" ]]; then
      sed -i 's/>PaSh Documentation/ class="title">PaSh Documentation/g' $DIR/index.html
      # Fix shortcuts redirections
      sed -i 's/videos-video-presentations/videos--video-presentations/g' $DIR/index.html
      sed -i 's/academic-papers-events/academic-papers--events/g' $DIR/index.html
      # fix tutorial links
      sed -i 's/tutorial#/tutorial\/index.html#/g' $DIR/index.html
      # fix annotations links
      sed -i 's/annotations#/annotations\/index.html#/g' $DIR/index.html
      # fix compiler links
      sed -i 's/compiler#/compiler\/index.html#/g' $DIR/index.html
      # fix runtime links
      sed -i 's/runtime#/runtime\/index.html#/g' $DIR/index.html
      # fix evaluation links
      sed -i 's/evaluation\/benchmarks\//evaluation\/benchmarks\/index.html/g' $DIR/index.html
  elif [[ "$type" = "tutorial" ]]; then
      sed -i 's/>A Short PaSh Tutorial/ class="title">A Short PaSh Tutorial/g' $DIR/index.html
      # open the correct installation file
      sed -i 's/href="..\/install\/"/href="..\/install\/index.html"/g' $DIR/index.html
      # fix contrib
      sed -i 's/..\/..\/contributing\/contrib.md/..\/..\/contributing\/index.html/g' $DIR/index.html
      # fix annotations link
      sed -i 's/..\/..\/annotations\//..\/..\/annotations\/index.html/g' $DIR/index.html
      # fix compiler link
      sed -i 's/..\/..\/compiler/..\/..\/compiler\/index.html/g' $DIR/index.html
      # fix runtime link
      sed -i 's/..\/..\/runtime/..\/..\/runtime\/index.html/g' $DIR/index.html
      # fix docs link
      sed -i 's/..\/..\/docs/..\/..\/docs\/index.html/g' $DIR/index.html
      # fix evaluation link
      sed -i 's/..\/..\/evaluation/..\/..\/evaluation\/index.html/g' $DIR/index.html

  elif [[ "$type" = "pash" ]]; then
      # this is the base case for the landing page
      sed -i 's/href="docs\/tutorial"/href="docs\/tutorial\/index.html"/g' $DIR/index.html
  elif [[ "$type" = "install" ]]; then
      # correct the title
      sed -i 's/>Installation/ class="title">Installation/g' $DIR/index.html
      sed -i 's/..\/contributing\/contrib.md/..\/contributing\/index.html/g' $DIR/index.html
  elif [[ "$type" = "annotations" ]]; then
      sed -i 's/>Parallelizability/ class="title">Parallelizability Classes/g' $DIR/index.html
      # fix redirection links
      sed -i 's/#parallelizability-study-of-commands-in-gnu--posix/#parallelizability-study-of-commands-in-gnu-posix/g' $DIR/index.html
      sed -i 's/href=".\/p_stats"/href=".\/p_stats\/index.html"/g' $DIR/index.html
      sed -i 's/#Issues/#issues/g' $DIR/index.html
  elif [[ "$type" = "compiler" ]]; then
      sed -i 's/>The PaSh Compiler/ class="title">The PaSh Compiler/g' $DIR/index.html
      # fix annotations links
      sed -i 's/annotations#/annotations\/index.html#/g' $DIR/index.html
      # fix broken parser link
      sed -i 's/href=".\/parser"/href=".\/parser\/index.html"/g' $DIR/index.html
      # fix runtime link
      sed -i 's/..\/runtime/..\/runtime\/index.html#/g' $DIR/index.html
  elif [[ "$type" = "runtime" ]]; then
      sed -i 's/>Runtime Support/ class="title">Runtime Support/g' $DIR/index.html
  elif [[ "$type" = "parser" ]]; then
      # fix title
      sed -i 's/<h2>Instructions<\/h2>/<h1 class="title">Instructions<\/h1>/g' $DIR/index.html
      # fix redirection
  elif [[ "$type" = "benchmarks" ]]; then
    # this is used for the evaluation/benchmarks/index.html
    sed -i 's/#unix-50-from-bell-labs/#unix50-from-bell-labs/g' $DIR/index.html;
    sed -i 's/>Experimental Evaluation/ class="title">Experimental Evaluation/g' $DIR/index.html
  fi
  cleanup $CSSDIR
}

function generate-styles {
    echo ' ' > ./utils/inc.html
    echo '<script type="text/javascript" src="UDIR/utils/fbox/jquery.fancybox.js?v=2.1.5"></script>' | sed "s;UDIR;$1;" >> ./utils/inc.html
    echo '<script type="text/javascript" src="UDIR/utils/fbox/helpers/jquery.fancybox-buttons.js?v=1.0.5"></script>' | sed "s;UDIR;$1;" >> ./utils/inc.html
    echo '<script type="text/javascript" src="UDIR/utils/fbox/helpers/jquery.fancybox-thumbs.js?v=1.0.7"></script>' | sed "s;UDIR;$1;" >> ./utils/inc.html
    echo ' <script src="UDIR/utils/js/main.js"></script>' | sed "s;UDIR;$1;" >> ./utils/inc.html

    echo ' ' > ./utils/css.html
    echo '<link rel="stylesheet" type="text/css" href="UDIR/utils/css/mystyle.css" media="screen" />' | sed "s;UDIR;$1;" >> ./utils/css.html
    echo '<link rel="stylesheet" type="text/css" href="UDIR/utils/fbox/jquery.fancybox.css?v=2.1.5" media="screen" />' | sed "s;UDIR;$1;" >> ./utils/css.html
    echo '<link rel="stylesheet" type="text/css" href="UDIR/utils/fbox/helpers/jquery.fancybox-buttons.css?v=1.0.5" />' | sed "s;UDIR;$1;" >> ./utils/css.html
    echo '<link rel="stylesheet" type="text/css" href="UDIR/utils/fbox/helpers/jquery.fancybox-thumbs.css?v=1.0.7" />' | sed "s;UDIR;$1;" >> ./utils/css.html
}

echo "Building all the pages"
rm -f $PASH_TOP/README.md
touch $PASH_TOP/README.md
mkdir -p $PASH_TOP/docs/benchmarks/
touch $PASH_TOP/docs/benchmarks/README.md
generate-html $PASH_TOP/docs/benchmarks/README.md
generate-html $PASH_TOP/docs/install/README.md
generate-html $PASH_TOP/README.md
generate-html $PASH_TOP/docs/README.md
generate-html $PASH_TOP/docs/tutorial/tutorial.md
generate-html $PASH_TOP/docs/contributing/contrib.md
generate-html $PASH_TOP/annotations/README.md
generate-html $PASH_TOP/annotations/p_stats/README.md
generate-html $PASH_TOP/compiler/README.md
generate-html $PASH_TOP/compiler/parser/README.md
generate-html $PASH_TOP/runtime/README.md
generate-html $PASH_TOP/evaluation/benchmarks/README.md
generate-html $PASH_TOP/evaluation/micro/README.md
