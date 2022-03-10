#!/bin/bash

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

VERBOSE=${VERBOSE:-"false"};
PDF=${PDF:-"false"};
version=$(grep __version__ $PASH_TOP/compiler/config.py | awk '{print $3}' | sed 's/"//g' || echo '"version": "0.1"')
VERSION=${VERSION:-$(echo $version | sed "s/^.*\"version\":[ ]*\"\(.*\)\".*$/\1/")};
UPDATED=$(LANG=en_us_88591; date +'%R'; date +'%m/%d/%Y')
while getopts hvp opt
do
    case "$opt" in
        (h) usage;;
        (v) VERBOSE="true";;
        (p) PDF="true";;
        (*) usage;;
    esac
done

shift $(($OPTIND - 1))

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
echo $MSG
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
CSSDIR="./" #$(realpath ./)
W="$DIR"
TOC_DEPTH="2"
if [[ "$DIR" == "./" || "$DIR" == "." ]]; then
    # if top-level
    CSSDIR="."
    W=""
fi
if [[ "$1" == "bib" ]]; then
    TOC_DEPTH="3"
fi

template=template.html
type=$(basename $dir)
if [[ "$type" = "docs" ]]; then
    export self_tab=$(cat <<-END
<a href="./tutorial/index.html">tutorial</a> /     
<a class="self" href="./docs">docs</a> /
<a href="./benchmarks/index.html">benchmarks</a> / 
END
)
CSSDIR="../"
elif [[ "$type" = "tutorial" ]]; then
    export self_tab=$(cat <<-END
<a class="self">tutorial</a>  /
<a href="../index.html">docs</a>  /
<a href="../benchmarks/index.html">benchmarks</a> /
END
)
CSSDIR="../.."
elif [[ "$type" = "tutorial" ]]; then
CSSDIR="../.."
elif [[ "$type" = "benchmarks" ]]; then
    export self_tab=$(cat <<-END
<a href="../tutorial/index.html">tutorial</a> /     
<a href="../index.html">docs</a>  /
<a class="self">benchmarks</a> /
END
)
CSSDIR="../.."
    wget ctrl.pash.ndr.md/client.js -O $DIR/client.js
    curl_data=$(curl -s "ctrl.pash.ndr.md/job=fetch_runs&count=50" | base64 | tr -d "\n")
    echo "local_data = Base64.decode(\`$curl_data\`);" >> $DIR/client.js
    echo "running_on_website = true;" >> $DIR/client.js
template="benchmarks.html"
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
#$DIR/metadata.yaml\
#    --biblio=./bib/bib.bib\
#    --csl=./utils/acm-sigchi-proceedings.csl\
# -f markdown+smart -t markdown-smart
pandoc -s $DIR/$filename\
    --variable revision="$(cd $DIR/;git rev-parse --short HEAD)"\
    --variable version="$VERSION"\
    --variable more="${2}"\
    --variable msg="$(cd $DIR/;commit-msg)"\
    --variable where="$W"\
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
    --variable UPDATED="$UPDATED"\
    --to=html5\
    --default-image-extension=svg\
    --template=./utils/$template\
    --highlight-style=pygments\
    --section-divs\
    --toc\
    --toc-depth="${TOC_DEPTH}"\
    --css="$CSSDIR"/utils/css/main.css\
    --filter pandoc-citeproc\
    --include-in-header=./utils/css.html\
    --include-after-body=./utils/inc.html\
    -o $DIR/index.html

  # fix the huge title
  if [[ "$(basename $dir)" = "docs" ]]; then
      sed -i 's/>PaSh Documentation/ class="title">PaSh Documentation/g' $DIR/index.html
  elif [[ "$(basename $dir)" = "tutorial" ]]; then
      sed -i 's/>A Short PaSh Tutorial/ class="title">A Short PaSh Tutorial/g' $DIR/index.html
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

echo "building all the pages"
rm -f $PASH_TOP/README.md
touch $PASH_TOP/README.md
mkdir -p $PASH_TOP/docs/benchmarks/
touch $PASH_TOP/docs/benchmarks/README.md
generate-html $PASH_TOP/README.md
generate-html $PASH_TOP/docs/README.md
generate-html $PASH_TOP/docs/benchmarks/README.md
generate-html $PASH_TOP/docs/tutorial/tutorial.md
#if [[ -z "$1" ]]; then
#    generate-html "." ## top-level
#    generate-html doc
#    generate-html tutorial
#else
#    # $1 is the path to the readme file
#    generate-html $PASH_TOP/$1
#fi

