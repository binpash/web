#!/bin/bash
set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
WEB_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
REPO_ROOT=$(cd "$WEB_DIR/.." && pwd)
DEFAULT_PASH_TOP="$REPO_ROOT/.cache/pash"
PASH_TOP=${PASH_TOP:-$DEFAULT_PASH_TOP}
DEFAULT_TRY_TOP="$REPO_ROOT/.cache/try"
TRY_TOP=${TRY_TOP:-$DEFAULT_TRY_TOP}
PUBLIC_DIR=${PUBLIC_DIR:-$REPO_ROOT/public}
PASH_REF=${PASH_REF:-osdi22-ae}
TRY_REF=${TRY_REF:-osdi26-ae}

cd "$WEB_DIR"

# nice getopts template:
# http://stackoverflow.com/a/10789394

arg0=$(basename $0.sh)

function usage {
    echo "Usage: $arg0 [-hvp] [./directory]"
    exit 1
}

version=$(grep __version__ "$PASH_TOP"/src/pash/__init__.py 2>/dev/null | awk '{print $3}' | sed 's/"//g' || true)
VERSION=${VERSION:-$(echo $version | sed "s/^.*\"version\":[ ]*\"\(.*\)\".*$/\1/")};
release_json=$(curl -fsSL https://api.github.com/repos/binpash/pash/releases/latest 2>/dev/null || true)
RELEASE_TAG=${RELEASE_TAG:-$(printf '%s\n' "$release_json" | sed -n 's/.*"tag_name": "\(.*\)",/\1/p' | head -n1)}
RELEASE_URL=${RELEASE_URL:-$(printf '%s\n' "$release_json" | sed -n 's/.*"html_url": "\(.*\)",/\1/p' | head -n1)}
RELEASE_TAG=${RELEASE_TAG:-$VERSION}
RELEASE_URL=${RELEASE_URL:-https://github.com/binpash/pash/releases/latest}
UPDATED=$(LANG=en_us_88591; date +'%R'; date +'%m/%d/%Y')

# cleanup
function cleanup {
    rm ./utils/inc.html
    rm ./utils/css.html
}

function ensure-pash-source {
    mkdir -p "$(dirname "$PASH_TOP")"
    rm -rf "$PASH_TOP"
    git init "$PASH_TOP" >/dev/null
    (
        cd "$PASH_TOP"
        git remote add origin https://github.com/binpash/pash
        git fetch --depth 1 origin "$PASH_REF"
        git checkout --detach FETCH_HEAD
    )
}

function ensure-try-source {
    mkdir -p "$(dirname "$TRY_TOP")"
    rm -rf "$TRY_TOP"
    git init "$TRY_TOP" >/dev/null
    (
        cd "$TRY_TOP"
        git remote add origin https://github.com/binpash/try
        git fetch --depth 1 origin "$TRY_REF"
        git checkout --detach FETCH_HEAD
    )
}

function sedi {
    sed -i.bak "$1" "$2"
    rm -f "$2.bak"
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
input_file="$DIR/$filename"
out_dir="$PUBLIC_DIR"
page_title="PaSh: Light-touch Data-Parallel Shell Scripting"
repo_url="http://github.com/binpash/pash"
repo_release_url="$RELEASE_URL"
repo_ref_label="version"
page_version="$VERSION"
if [[ "$1" == "$WEB_DIR/utils/landing.html" ]]; then
    DIR="$WEB_DIR"
    input_file="/dev/null"
elif [[ "$1" == "$PASH_TOP/docs/README.md" ]]; then
    out_dir="$PUBLIC_DIR/docs"
elif [[ "$1" == "$PASH_TOP/docs/install/README.md" ]]; then
    out_dir="$PUBLIC_DIR/docs/install"
elif [[ "$1" == "$PASH_TOP/docs/tutorial/tutorial.md" ]]; then
    out_dir="$PUBLIC_DIR/docs/tutorial"
elif [[ "$1" == "$PASH_TOP/docs/contributing/contrib.md" ]]; then
    out_dir="$PUBLIC_DIR/docs/contributing"
elif [[ "$1" == "$PASH_TOP/annotations/README.md" ]]; then
    out_dir="$PUBLIC_DIR/annotations"
elif [[ "$1" == "$PASH_TOP/annotations/p_stats/README.md" ]]; then
    out_dir="$PUBLIC_DIR/annotations/p_stats"
elif [[ "$1" == "$PASH_TOP/compiler/README.md" ]]; then
    out_dir="$PUBLIC_DIR/compiler"
elif [[ "$1" == "$PASH_TOP/compiler/parser/README.md" ]]; then
    out_dir="$PUBLIC_DIR/compiler/parser"
elif [[ "$1" == "$PASH_TOP/runtime/README.md" ]]; then
    out_dir="$PUBLIC_DIR/runtime"
elif [[ "$1" == "$WEB_DIR/docs/benchmarks/README.md" ]]; then
    out_dir="$PUBLIC_DIR/docs/benchmarks"
elif [[ "$1" == "$TRY_TOP/README.md" ]]; then
    out_dir="$PUBLIC_DIR/try"
    page_title="try"
    repo_url="https://github.com/binpash/try"
    repo_release_url="https://github.com/binpash/try/tree/$TRY_REF"
    repo_ref_label="branch"
    page_version="$TRY_REF"
fi
mkdir -p "$out_dir"
out_file="$out_dir/index.html"
if [[ "$type" = "docs" ]]; then
    export self_tab=$(cat <<-END
<a href="./tutorial/index.html">tutorial</a> /     
<a class="self" href="./index.html">docs</a> /
<a href="https://github.com/binpash/pash/blob/main/evaluation/benchmarks/README.md">benchmarks</a> / 
END
)
CSSDIR="../"
elif [[ "$type" = "tutorial" ]];  then
    export self_tab=$(cat <<-END
<a class="self" href="./index.html">tutorial</a> /
<a href="../index.html">docs</a>  /
<a href="https://github.com/binpash/pash/blob/main/evaluation/benchmarks/README.md">benchmarks</a> /
END
)
CSSDIR="../.."
elif [[ "$type" = "install" ]] || [[ "$type" = "contributing" ]]; then
CSSDIR="../.."
    export self_tab=$(cat <<-END
<a class="self" href="../tutorial/index.html">tutorial</a> /
<a href="../index.html">docs</a>  /
<a href="https://github.com/binpash/pash/blob/main/evaluation/benchmarks/README.md">benchmarks</a> /
END
)
elif [[ "$type" = "p_stats" ]] || [[ "$type" = "parser" ]]; then
CSSDIR="../.."
    export self_tab=$(cat <<-END
<a class="self" href="../../docs/tutorial/index.html">tutorial</a> /
<a href="../index.html">docs</a>  /
<a href="https://github.com/binpash/pash/blob/main/evaluation/benchmarks/README.md">benchmarks</a> /
END
)
elif [[ "$type" = "benchmarks" ]]; then
    CSSDIR="../.."
    template=benchmarks.html
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
fi
elif [[ "$type" = "annotations" ]] || [[ "$type" = "compiler" ]] || [[ "$type" = "runtime" ]]; then
    CSSDIR="../"
    export self_tab=$(cat <<-END
<a href="../docs/tutorial/index.html">tutorial</a> /     
<a href="../docs/index.html">docs</a>  /
<a href="https://github.com/binpash/pash/blob/main/evaluation/benchmarks/README.md">benchmarks</a> /
END
)
elif [[ "$1" == "$TRY_TOP/README.md" ]]; then
    CSSDIR="../"
    export self_tab=$(cat <<-END
<a href="../docs/tutorial/index.html">tutorial</a> /     
<a href="../docs/index.html">docs</a>  /
<a href="https://github.com/binpash/pash/blob/main/evaluation/benchmarks/README.md">benchmarks</a> /
END
)
else
    export self_tab=$(cat <<-END
<a href="./docs/tutorial/index.html">tutorial</a> /     
<a href="./docs/index.html">docs</a>  /
<a href="https://github.com/binpash/pash/blob/main/evaluation/benchmarks/README.md">benchmarks</a> /
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
pandoc -s "$input_file"\
    --variable revision="$(cd $DIR/;git rev-parse --short HEAD)"\
    --variable release_tag="$RELEASE_TAG"\
    --variable release_url="$RELEASE_URL"\
    --variable version="$page_version"\
    --variable more="${2}"\
    --variable msg="$(cd $DIR/;commit-msg)"\
    --variable where="$DIR"\
    --variable pash_logo="$CSSDIR/utils/img/pash_logo2.jpg"\
    --variable title="$page_title"\
    --variable repo_url="$repo_url"\
    --variable repo_release_url="$repo_release_url"\
    --variable repo_ref_label="$repo_ref_label"\
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
    --from=markdown\
    --to=html5\
    --default-image-extension=svg\
    --template=./utils/$template\
    --highlight-style=pygments\
    --section-divs\
    --toc\
    --citeproc\
    --css="$CSSDIR"/utils/css/main.css\
    --include-in-header=./utils/css.html\
    --include-after-body=./utils/inc.html\
    -o "$out_file"

  # fix the huge title
  if [[ "$type" = "docs" ]]; then
      sedi 's/>PaSh Documentation/ class="title">PaSh Documentation/g' "$out_file"
      # Fix shortcuts redirections
      sedi 's/videos-video-presentations/videos--video-presentations/g' "$out_file"
      sedi 's/academic-papers-events/academic-papers--events/g' "$out_file"
      # fix tutorial links
      sedi 's/tutorial#/tutorial\/index.html#/g' "$out_file"
      # fix annotations links
      sedi 's/annotations#/annotations\/index.html#/g' "$out_file"
      # fix compiler links
      sedi 's/compiler#/compiler\/index.html#/g' "$out_file"
      # fix runtime links
      sedi 's/runtime#/runtime\/index.html#/g' "$out_file"
      # fix evaluation links
      sedi 's/evaluation\/benchmarks\//evaluation\/benchmarks\/index.html/g' "$out_file"
  elif [[ "$type" = "tutorial" ]]; then
      sedi 's/>A Short PaSh Tutorial/ class="title">A Short PaSh Tutorial/g' "$out_file"
      # open the correct installation file
      sedi 's/href="..\/install\/"/href="..\/install\/index.html"/g' "$out_file"
      # fix contrib
      sedi 's/..\/..\/contributing\/contrib.md/..\/..\/contributing\/index.html/g' "$out_file"
      # fix docs link
      sedi 's/..\/..\/docs/..\/..\/docs\/index.html/g' "$out_file"
      # restore local links for generated pages
      sedi 's#href="../../annotations/"#href="../../annotations/index.html"#g' "$out_file"
      sedi 's#href="../../annotations/index.html"#href="../../annotations/index.html"#g' "$out_file"
      sedi 's#href="../../compiler"#href="../../compiler/index.html"#g' "$out_file"
      sedi 's#href="../../compiler/index.html"#href="../../compiler/index.html"#g' "$out_file"
      sedi 's#href="../../runtime"#href="../../runtime/index.html"#g' "$out_file"
      sedi 's#href="../../runtime/index.html"#href="../../runtime/index.html"#g' "$out_file"
      # keep missing pages on upstream
      sedi 's#href="../../evaluation"#href="https://github.com/binpash/pash/tree/'"$PASH_REF"'/evaluation"#g' "$out_file"
      sedi 's#href="../../evaluation/index.html"#href="https://github.com/binpash/pash/tree/'"$PASH_REF"'/evaluation"#g' "$out_file"
      sedi 's#href="../../docs/index.html/contributing/contrib.md"#href="../contributing/index.html"#g' "$out_file"
      sedi 's|href="../README.md#academic-papers--events"|href="https://github.com/binpash/pash/tree/'"$PASH_REF"'/docs#academic-papers--events"|g' "$out_file"

  elif [[ "$type" = "pash" ]]; then
      # this is the base case for the landing page
      sedi 's/href="docs\/tutorial"/href="docs\/tutorial\/index.html"/g' "$out_file"
  elif [[ "$type" = "install" ]]; then
      # correct the title
      sedi 's/>Installation/ class="title">Installation/g' "$out_file"
      sedi 's/..\/contributing\/contrib.md/..\/contributing\/index.html/g' "$out_file"
  elif [[ "$type" = "annotations" ]]; then
      sedi 's/>Parallelizability/ class="title">Parallelizability Classes/g' "$out_file"
      # fix redirection links
      sedi 's/#parallelizability-study-of-commands-in-gnu--posix/#parallelizability-study-of-commands-in-gnu-posix/g' "$out_file"
      sedi 's/href=".\/p_stats"/href=".\/p_stats\/index.html"/g' "$out_file"
      sedi 's/#Issues/#issues/g' "$out_file"
  elif [[ "$type" = "compiler" ]]; then
      sedi 's/>The PaSh Compiler/ class="title">The PaSh Compiler/g' "$out_file"
      # fix annotations links
      sedi 's/annotations#/annotations\/index.html#/g' "$out_file"
      # fix broken parser link
      sedi 's/href=".\/parser"/href=".\/parser\/index.html"/g' "$out_file"
      # fix runtime link
      sedi 's/..\/runtime/..\/runtime\/index.html#/g' "$out_file"
  elif [[ "$type" = "runtime" ]]; then
      sedi 's/>Runtime Support/ class="title">Runtime Support/g' "$out_file"
  elif [[ "$type" = "parser" ]]; then
      # fix title
      sedi 's/<h2>Instructions<\/h2>/<h1 class="title">Instructions<\/h1>/g' "$out_file"
      # fix redirection
  elif [[ "$type" = "benchmarks" ]]; then
    # this is used for the evaluation/benchmarks/index.html
    sedi 's/#unix-50-from-bell-labs/#unix50-from-bell-labs/g' "$out_file";
    sedi 's/>Experimental Evaluation/ class="title">Experimental Evaluation/g' "$out_file"
  elif [[ "$1" == "$TRY_TOP/README.md" ]]; then
      sedi 's#https://raw.githubusercontent.com/binpash/try/main/try#https://raw.githubusercontent.com/binpash/try/'"$TRY_REF"'/try#g' "$out_file"
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

echo "Building website"
ensure-pash-source
ensure-try-source
rm -rf "$PUBLIC_DIR"
mkdir -p "$PUBLIC_DIR"
generate-html "$WEB_DIR/utils/landing.html"
generate-html "$PASH_TOP/docs/install/README.md"
generate-html "$PASH_TOP/docs/README.md"
generate-html "$PASH_TOP/docs/tutorial/tutorial.md"
generate-html "$PASH_TOP/docs/contributing/contrib.md"
generate-html "$PASH_TOP/annotations/README.md"
generate-html "$PASH_TOP/annotations/p_stats/README.md"
generate-html "$PASH_TOP/compiler/README.md"
generate-html "$PASH_TOP/compiler/parser/README.md"
generate-html "$PASH_TOP/runtime/README.md"
generate-html "$TRY_TOP/README.md"

mkdir -p "$PUBLIC_DIR/try/docs"
cp "$TRY_TOP/docs/try_logo.png" "$PUBLIC_DIR/try/docs/"
cp "$TRY_TOP/docs/try_pip_install_example.gif" "$PUBLIC_DIR/try/docs/"
cp -R "$REPO_ROOT/web/utils" "$PUBLIC_DIR/"
cp "$REPO_ROOT/web/favicon.ico" "$PUBLIC_DIR/"
