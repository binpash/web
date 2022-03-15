$(document).ready(function(){
  console.log("start");
  $(".citation").each(function(index) {
    var txt = $(this).text();
    var cit = $(this).attr("data-cites");
    var lst = JSON.parse(txt);
    var res = "[";
    for (var i = 0; i < lst.length; i++) { 
      res += ("<a href='#cit"+lst[i]+"'>"+lst[i]+"</a>"+", ")
    }
    res = (res.substring(0, (res.length - 2)) + "]")
    $(this).html(res);
    //console.log("(.citation) res:", res);
  });
  $(".references").children("div").children("p").each(function(index) {
    console.log('pizza');
    var txt = $(this).text();
    var id = txt.split(" ")[0];
    $(this).attr("id", ("cit"+id.substring(1, (id.length - 1))));
    // we don't need to wrap it in <div> or <a> -- we simply need to add an id
    // as done above..!
    //var res = '<div id="'+id+'">'+txt+'</div>';
    //$(this).html(res);
    //console.log("(references) id:", res);
  });
  $("code.bibtex").each(function(index) {
    var bibId = $(this).children("span.ot").text();
    try {
      var url = $(this).text().split("url")[1].split("{")[1].split("}")[0]; // TODO: Check if url does not exist
      $(this).children("span.ot").replaceWith("<a class=\"ot\" href=\""+url+"\">" + bibId + "</a>");
      //console.log(url)
    } catch(e) {console.log(bibId + " has no url")} // it's OK
  });
  $("figure").each(function(index) {
    var img = $(this).children("img");
    console.log(img)
    var capt = $(this).children("figcaption").text();
    console.log(capt)
    var fbox = '<a class="fancybox" href="' + img.attr("src") + '" data-fancybox-group="gallery" title="' + capt + '"><img src="' + img.attr("src") + '" alt="" /></a>'
    console.log(fbox)
    try {
      img.replaceWith(fbox);
    } catch(e) {console.log("Problem with img!")} 
  });

  /*
   *  Simple image gallery. Uses default settings
   */

  $('.fancybox').fancybox({
    beforeShow: function () {
      // set new fancybox width
      var newWidth = this.width * 4;
      // apply new size to img
      $(".fancybox-image").css({
        "width": newWidth,
        "height": "auto"
      });
      // set new values for parent container
      this.width = newWidth;
      this.height = $(".fancybox-image").innerHeight();
    },
    autoScale: true,
    allowfullscreen: true,
    helpers : {
      title: {
        type: 'inside'
      }
    }
  });
});
