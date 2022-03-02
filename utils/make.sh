#!/bin/bash

# nice getopts template:
# http://stackoverflow.com/a/10789394

arg0=$(basename $0.sh)

function usage {
    echo "Usage: $arg0 [-hvp] [./directory]"
    exit 1
}

function error {
    echo "$arg0: $*" 1>&2
    exit 1
}

VERBOSE=${VERBOSE:-"false"};
PDF=${PDF:-"false"};
version=$(grep __version__ ../pash/compiler/config.py | awk '{print $3}' | sed 's/"//g' || echo '"version": "0.1"')
VERSION=${VERSION:-$(echo $version | sed "s/^.*\"version\":[ ]*\"\(.*\)\".*$/\1/")};
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
  DIR=${1:-"."}
  CSSDIR=$(realpath ./)
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

  generate-styles $CSSDIR
    echo $CSSDIR
#$DIR/metadata.yaml\
#    --biblio=./bib/bib.bib\
#    --csl=./utils/acm-sigchi-proceedings.csl\

  # -f markdown+smart -t markdown-smart
  pandoc -s $DIR/README.md\
    --variable revision="$(cd $DIR/;git rev-parse --short HEAD)"\
    --variable version="$VERSION"\
    --variable more="${2}"\
    --variable msg="$(cd $DIR/;commit-msg)"\
    --variable where="$W"\
    --variable pash_logo="${CSSDIR}/pash_logo2.jpg"\
    --variable title="PaSh: Light-touch Data-Parallel Shell Scripting"\
    --to=html5\
    --default-image-extension=svg\
    --template=./utils/template.html\
    --highlight-style=pygments\
    --section-divs\
    --toc\
    --toc-depth="${TOC_DEPTH}"\
    --css="${CSSDIR}"/utils/css/main.css\
    --filter pandoc-citeproc\
    --include-in-header=./utils/css.html\
    --include-after-body=./utils/inc.html\
    -o $DIR/index.html

  # fix the huge title
  sed -i 's/>PaSh Documentation/ class="title">PaSh Documentation/g' $DIR/index.html


  #cleanup $CSSDIR
}

function generate-styles {
  echo ' ' > ./utils/inc.html
  echo '<script type="text/javascript" src="UDIR/utils/fbox/jquery.fancybox.js?v=2.1.5"></script>' | sed "s;UDIR;$1;" >> ./utils/inc.html
  echo '<script type="text/javascript" src="UDIR/utils/fbox/helpers/jquery.fancybox-buttons.js?v=1.0.5"></script>' | sed "s;UDIR;$1;" >> ./utils/inc.html
  echo '<script type="text/javascript" src="UDIR/utils/fbox/helpers/jquery.fancybox-thumbs.js?v=1.0.7"></script>' | sed "s;UDIR;$1;" >> ./utils/inc.html
  echo ' <script src="UDIR/utils/js/main.js"></script>' | sed "s;UDIR;$1;" >> ./utils/inc.html

  echo ' ' > ./utils/css.html
  echo '<link rel="stylesheet" type="text/css" href="UDIR/utils/fbox/jquery.fancybox.css?v=2.1.5" media="screen" />' | sed "s;UDIR;$1;" >> ./utils/css.html
  echo '<link rel="stylesheet" type="text/css" href="UDIR/utils/fbox/helpers/jquery.fancybox-buttons.css?v=1.0.5" />' | sed "s;UDIR;$1;" >> ./utils/css.html
  echo '<link rel="stylesheet" type="text/css" href="UDIR/utils/fbox/helpers/jquery.fancybox-thumbs.css?v=1.0.7" />' | sed "s;UDIR;$1;" >> ./utils/css.html
}

if [[ -z "$1" ]]; then
  generate-html "." ## top-level
  generate-html doc
  generate-html tutorial
else
  # $2 is the absolute path to utils
  generate-html "$1" 
fi

