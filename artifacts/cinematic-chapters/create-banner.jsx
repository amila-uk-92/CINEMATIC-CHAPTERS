#target photoshop
app.bringToFront();
(function () {
  var previousUnits = app.preferences.rulerUnits;
  app.preferences.rulerUnits = Units.PIXELS;
  var out = new Folder('C:/Users/amila/OneDrive/Documents/workspace/CC/artifacts/cinematic-chapters');
  var source = app.open(new File('C:/Users/amila/AppData/Local/Temp/codex-clipboard-fb2c0e01-aa42-491f-9406-b73e31d785fa.png'));
  var doc = source.duplicate('Cinematic Chapters - recreated banner', false);
  source.close(SaveOptions.DONOTSAVECHANGES);
  var s = doc.width.as('px') / 2048;
  doc.activeLayer.name = 'Black background';
  var reference = doc.activeLayer.duplicate();
  reference.name = 'Original reference - hidden';
  reference.visible = false;
  doc.activeLayer = doc.layers[1];
  var black = new SolidColor(); black.rgb.hexValue = '000000';
  doc.selection.selectAll();
  doc.selection.fill(black); doc.selection.deselect();
  var photoDoc=app.open(new File('D:/Cinamatic Chaptor/Tanush -Sew/1/DSC00527.jpg'));
  photoDoc.activeLayer.duplicate(doc,ElementPlacement.PLACEATBEGINNING);
  photoDoc.close(SaveOptions.DONOTSAVECHANGES); app.activeDocument=doc;
  var photo=doc.activeLayer; photo.name='DSC00527 - original photograph';
  var pb=photo.bounds;var pw=pb[2].as('px')-pb[0].as('px');
  var ratio=1198*s/pw*100; photo.resize(ratio,ratio,AnchorPosition.TOPLEFT);
  pb=photo.bounds;photo.translate(850*s-pb[0].as('px'),-820*s-pb[1].as('px'));
  var fade=doc.artLayers.add(); fade.name='Black fade into photograph';
  for(var gx=850;gx<1100;gx+=2) {
    doc.selection.select([[gx*s,0],[(gx+2)*s,0],[(gx+2)*s,1262], [gx*s,1262]]);
    doc.selection.fill(black,ColorBlendMode.NORMAL,100*(1100-gx)/250);
  }
  doc.selection.deselect();
  function color(hex) { var c = new SolidColor(); c.rgb.hexValue = hex; return c; }
  function font(preferred) {
    for (var i=0;i<app.fonts.length;i++) if(app.fonts[i].postScriptName === preferred) return preferred;
    return 'ArialMT';
  }
  function text(name, content, face, hex, x, y, w, h, tracking) {
    var l = doc.artLayers.add(); l.kind = LayerKind.TEXT; l.name = name;
    l.textItem.contents = content; l.textItem.font = font(face);
    l.textItem.size = 100; l.textItem.color = color(hex);
    l.textItem.position = [x*s,(y+100)*s];
    if(tracking) l.textItem.tracking = tracking;
    var b=l.bounds; var bw=b[2].as('px')-b[0].as('px'); var bh=b[3].as('px')-b[1].as('px');
    l.resize(w*s/bw*100,h*s/bh*100,AnchorPosition.TOPLEFT);
    b=l.bounds; l.translate(x*s-b[0].as('px'), y*s-b[1].as('px'));
    return l;
  }
  function rect(name,x,y,w,h,hex,border) {
    var l=doc.artLayers.add();l.name=name;
    doc.selection.select([[x*s,y*s],[(x+w)*s,y*s],[(x+w)*s,(y+h)*s],[x*s,(y+h)*s]]);
    if(border) doc.selection.stroke(color(hex),border*s,StrokeLocation.INSIDE); else doc.selection.fill(color(hex));
    doc.selection.deselect(); return l;
  }
  rect('Gold logo frame',245,50,59,60,'B39C62',1.5);
  text('CC monogram','CC','Bahnschrift','B39C62',265,69,23,24,0);
  text('Brand name','CINEMATIC CHAPTERS','Bahnschrift','F0EDE5',325,59,300,26,150);
  text('Brand location','PHOTOGRAPHY · LEICESTER','ArialMT','B6B0A1',324,99,272,10,350);
  rect('Tagline gold rule',245,197,34,1.5,'B39C62',0);
  text('Tagline','TWO PERSPECTIVES. ONE STORY.','Bahnschrift','B39C62',296,191,298,13,350);
  text('Headline - MOMENTS','MOMENTS','Impact','F0EDE5',250,260,484,103,0);
  var outline=text('Headline - BECOME (outlined)','BECOME','Impact','A6A399',250,382,397,104,0);
  doc.activeLayer=outline;
  var set=new ActionDescriptor();var ref=new ActionReference();ref.putProperty(charIDToTypeID('Prpr'),charIDToTypeID('Lefx'));ref.putEnumerated(charIDToTypeID('Lyr '),charIDToTypeID('Ordn'),charIDToTypeID('Trgt'));set.putReference(charIDToTypeID('null'),ref);
  var fx=new ActionDescriptor();fx.putUnitDouble(charIDToTypeID('Scl '),charIDToTypeID('#Prc'),100);
  var stroke=new ActionDescriptor();stroke.putBoolean(charIDToTypeID('enab'),true);stroke.putEnumerated(charIDToTypeID('Styl'),charIDToTypeID('FStl'),charIDToTypeID('OutF'));stroke.putEnumerated(charIDToTypeID('PntT'),charIDToTypeID('FrFl'),charIDToTypeID('SClr'));stroke.putEnumerated(charIDToTypeID('Md  '),charIDToTypeID('BlnM'),charIDToTypeID('Nrml'));stroke.putUnitDouble(charIDToTypeID('Opct'),charIDToTypeID('#Prc'),100);stroke.putUnitDouble(charIDToTypeID('Sz  '),charIDToTypeID('#Pxl'),1.1*s);
  var rgb=new ActionDescriptor();rgb.putDouble(charIDToTypeID('Rd  '),151);rgb.putDouble(charIDToTypeID('Grn '),149);rgb.putDouble(charIDToTypeID('Bl  '),140);stroke.putObject(charIDToTypeID('Clr '),charIDToTypeID('RGBC'),rgb);fx.putObject(charIDToTypeID('FrFX'),charIDToTypeID('FrFX'),stroke);set.putObject(charIDToTypeID('T   '),charIDToTypeID('Lefx'),fx);executeAction(charIDToTypeID('setd'),set,DialogModes.NO);
  outline.fillOpacity=0;
  text('Headline - CHAPTERS','CHAPTERS','Impact','F0EDE5',249,504,523,103,0);
  text('Description line 1','Cinematic photography for the moments that matter.','ArialMT','CECABD',245,655,422,18,0);
  text('Description line 2','Based in Leicester. Creating stories across the surrounding area.','ArialMT','CECABD',245,687,524,18,0);
  var options=new PhotoshopSaveOptions(); options.layers=true; options.embedColorProfile=true;
  doc.saveAs(new File(out.fsName+'/Cinematic-Chapters-Banner.psd'),options,true,Extension.LOWERCASE);
  var png=new PNGSaveOptions(); doc.saveAs(new File(out.fsName+'/Cinematic-Chapters-Banner.png'),png,true,Extension.LOWERCASE);
  app.preferences.rulerUnits=previousUnits;
})();
