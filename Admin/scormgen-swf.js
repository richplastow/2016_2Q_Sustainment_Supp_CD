//// scormgen-swf v0.0.7
//// ===================

//// Usage:
//// $ node [your path here]/Admin/scormgen-swf.js


!function (
    fstream  // bundled, `/*fstream*/ (function e(t,n,r){...`, below
  , tar      // bundled, see `/*tar*/ (function e(t,n,r){...`, below
  , ziplocal // bundled, `/ziplocal*/ (function e(t,n,r){...`, below
) {

//// Initialize variables. 
var
    fs   = require('fs')
  , path = require('path')
  , zlib = require('zlib')
  , gzip = zlib.createGzip()
  , zipSize = null
  , tarGzSize = null
  , courseTitle     // taken from the first line of ‘README.md’
  , courseSlug      // taken from the repo directory name
  , titles     = {} // taken from the directories in ‘../Working FLAs/’
  , swfs       = []
  , swfToTitle = {}
  , uuids      = [] // one for each swf
  , reports    = []
  , tmp = path.resolve( __dirname, 
      'scormgen-swf~tmp'+(Math.random()+'00000000').substr(2,8) )
  , SCORMPackagePath = path.resolve(__dirname, '..', 'SCORM Package')
  , SCORMContentPath
  , timeStamp = getTimeStamp()
  , step = 0 // index in `chain`
  , chain = [] // sequential process for creating a SCORM package
  , contentUuid = generateUuid()
  , welcomePngUuid = generateUuid()
  // , parseString = require('xml2js').parseString
;


//// Initial runtime checks. 
var debug = (process.argv[2] && '--debug' == process.argv[2]);
if ('object' !== typeof process || ! process.argv) throw Error('Run in node!');
if ( 'Admin' != path.basename(__dirname) ) {
  throw Error('scormgen-swf.js must be placed in a directory named ‘Admin’');
}




//// OUTPUT-MESSAGE FUNCTIONS
function err (e) {
  if (debug) {
    console.log('step',step-1,e.stack);
    console.trace();
  } else {
    console.log('\033[31mscormgen-swf error at step '+(step-1)+':\033[1m\n  ' // bright red
      + e.message + '\033[0m');
  }
  rmrf(tmp); // recursively delete the temporary directory
}

function log () {
  var args = [].slice.call(arguments);
  args.unshift('\033[32mscormgen-swf:\033[1m\n '); // bright green
  args.push('\033[0m');
  console.log.apply(console, args);
}




//// UTILITIES
//// from https://github.com/mrDarcyMurphy/node-rmrf/blob/master/index.js
function rmrf (dirPath) {
  if (fs.existsSync(dirPath)) {
    var files = fs.readdirSync(dirPath)
    if (files && files.length > 0) {
      for (var i = 0; i < files.length; i++) {
        var filePath = path.resolve(dirPath, files[i]);
        if (fs.statSync(filePath).isFile())
          fs.unlinkSync(filePath)
        else
          rmrf(filePath)
      }
    }
    fs.rmdirSync(dirPath)
  }
}


//// from http://stackoverflow.com/a/21995878
function copyFile(source, target, cb) {
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on("error", done);

  var wr = fs.createWriteStream(target);
  wr.on("error", done);
  wr.on("close", function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
}


//// from http://stackoverflow.com/a/21995878
function generateUuid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)
      .toUpperCase()
    ;
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}


function leftZeroPad(len, str) {
  return ( new Array(len - (str+'').length + 1) ).join('0') + str;
}


function getTimeStamp() {
  var now = new Date();
  return ([
      now.getUTCFullYear()
    , leftZeroPad( 2, now.getUTCMonth() + 1) // Jan would be `0`
    , leftZeroPad( 2, now.getUTCDate() )
    , '_'
    , leftZeroPad( 2, now.getUTCHours() )
    , leftZeroPad( 2, now.getUTCMinutes() )
    , leftZeroPad( 2, now.getUTCSeconds() )
  ]).join('');
}




//// BUNDLED NPM MODULES
!function(){ // inside closure





































}(); // end closure



//// CHAIN FUNCTIONS


//// Get the course slug from the top-level directory name. 
chain.push(function getCourseSlug () {
  try {

    courseSlug = path.basename( path.resolve(__dirname, '..') );
    if (! /^[_a-z0-9]+$/i.test(courseSlug) ) throw Error('‘'+courseSlug+'’ is '
      +'an invalid course slug.\n  '
      +'The course slug is taken from the name of the directory at the top-level\n  '
      +'of the repo, which should also be the name of the repo on GitHub. \n  '
      +'It can only contain letters (upper or lowercase), digits and underscores.'
    );

    //// Generate the path for the finished SCORM content. 
    SCORMContentPath = path.resolve(SCORMPackagePath, courseSlug + '_' + timeStamp);

    //// Continue to the next step. 
    chain[step++]();

  } catch (e) { err(e); }
});



//// Get the course title from the README.md file. 
chain.push(function readCourseTitle () {
  fs.readFile( path.resolve(__dirname, '..', 'README.md'), chain[step++]);
});

chain.push(function processCourseTitle (e, result) { // args from `readFile()` in `readCourseTitle()`
  try {
    if (e && 'ENOENT' == e.code) throw Error(
      'The top-level must contain a ‘README.md’ file');
    if (e) return err(e);

    //// convert to string, replace first CR with LF, convert to array of lines. 
    result = (result+'').replace(/\r/, '\n').split('\n'); 
    var line, match, i=0;
    while ( 'string' == typeof (line = result[i++]) ) { // will be undefined after last line
      match = line.match(/^#\s+(\w[ \w]+)/);
      if (match) {
        courseTitle = match[1].trim();
        break;
      }
    }
    if (! courseTitle) throw Error('The top-level ‘README.md’ file is invalid.\n  '
      +'It must contain the course title on a line starting ‘# ’, for example:\n\n  '
      +'# 2016 2Q Sustainment - Independent Contractors - Bulk\n');

    //// Continue to the next step. 
    chain[step++]();

  } catch (e) { err(e); }
});



chain.push(function readWorkingDir () {
  fs.readdir( path.resolve(__dirname, '..', 'Working FLAs'), chain[step++]);
});

chain.push(function processWorkingDir (e, result) { // args from `readdir()` in `readWorkingDir()`
  try {
    if (e && 'ENOENT' == e.code) throw Error(
      'The ‘Admin’ directory must be placed alongside a ‘Working FLAs’ directory');
    if (e) return err(e);

    var workingDirTally = 0;
    result.forEach( function (item) {
      if ( '.' == item.substr(0,1) ) return; // ignore invisibles
      var match = item.match(/^(\d+(\.\d+)?)\.?\s+([- a-z0-9]+)$/i);
      if (! match) throw Error('‘'+item+'’ is an invalid directory name.\n  '
        +'Names of directories in ‘Working FLAs’ must begin with a number (plus\n  '
        +'optional trailing dot). Next comes a space. Next comes the title,\n  '
        +'containing letters (upper or lowercase), digits, hyphens and spaces.'
      );
      titles[ +match[1] ] = match[3];
      workingDirTally++;
    });
    if (! workingDirTally) throw Error('There are no directories in ‘Working FLAs’');

    //// Continue to the next step. 
    chain[step++]();

  } catch (e) { err(e); }
});



chain.push(function readSWFsDir () {
  fs.readdir( path.resolve(__dirname, '..', 'SWFs'), chain[step++] );
});



chain.push(function processSWFsDir (e, result) { // args from `readdir()` in `readSWFsDir()`
  try {
    if (e && 'ENOENT' == e.code) throw Error(
      'The ‘Admin’ directory must be placed alongside a ‘SWFs’ directory');
    if (e) return err(e);

    //// Fill the `swfs` and `reports` array, and error-check the swf filenames.
    var hasInterfaceSwf = hasWelcomePng = false;
    result.forEach( function (item) {
      if ( '.swf'        == item.substr(-4) )  swfs.push(item);
      if ( ' Report.txt' == item.substr(-11) ) reports.push(item);
      if ( 'interface.swf' == item) hasInterfaceSwf = true;
      if ( 'welcome.png'   == item) hasWelcomePng   = true;
    });
    if (!hasInterfaceSwf) throw Error('The special ‘interface.swf’ is missing');
    if (!hasWelcomePng)   throw Error('The special ‘welcome.png’ is missing');

    //// Make sure that every swf has a matching directory in ‘Working FLAs’. 
    swfs.forEach( function (swf) {
      var match = swf.match(/^interface\.swf$|^(\d+(\.\d+)?)_[_0-9a-z]+\.swf$/);
      if (! match) throw Error('‘'+swf+'’ is an invalid swf name.\n  '
        +'Names of swfs in ‘SWFs’ must begin with a number. Next comes an\n  '
        +'underscore. The remaining characters must be lowercase letters,\n  '
        +'digits, and underscores. The special ‘interface.swf’ file is an\n  '
        +'exception to this rule. ');
      if ('interface.swf' == swf) return;
      swfToTitle[swf] = titles[ +match[1] ];
      if (! swfToTitle[swf]) throw Error('Cannot find title for ‘'+swf+'’.\n  '
        +'Please ensure that a directory in ‘Working FLAs’ has a name which\n  '
        +'begins with the number ‘'+(+match[1])+'’. ');
    });
    if (! swfs.length) throw Error('There are no swf files in ' + __dirname);


    //// Show a quick summary. 
    log('‘' + courseTitle + '’ has '
      + swfs.length    + ' swf'    + (1==swfs.length?'':'s') + ' and '
      + reports.length + ' report' + (1==reports.length?'':'s') + '.\n  '
      + 'Generating ‘SCORM Package/' + courseSlug + '_' + timeStamp + '/’...'
    );

    //// Continue to the next step. 
    chain[step++]();

  } catch(e) { err(e); }
});



chain.push(function generateUuids () {
  swfs.forEach( function () {
    uuids.push( generateUuid() );
  });
  chain[step++]();
});



chain.push(function makeTmpDir () {
  fs.mkdir(tmp, chain[step++]);
});



chain.push(function createDir1 () {
  fs.mkdir( path.resolve(tmp, 'ICU_' + contentUuid), function (e) { if(e){return err(e)} chain[step++]() });
});



chain.push(function createDir2 () {
  fs.mkdir( path.resolve(tmp, 'ICU_' + contentUuid, 'Data'), function (e) { if(e){return err(e)} chain[step++]() });
});



chain.push(function createDir3 () {
  fs.mkdir( path.resolve(tmp, 'ICU_' + contentUuid, 'Media'), function (e) { if(e){return err(e)} chain[step++]() });
});



chain.push(function createDir4 () {
  fs.mkdir( path.resolve(tmp, 'Interfaces'), function (e) { if(e){return err(e)} chain[step++]() });
});



chain.push(function createDir5 () {
  fs.mkdir( path.resolve(tmp, 'Interfaces', 'empty_C3_interface'), function (e) { if(e){return err(e)} chain[step++]() });
});



chain.push(function createDir6 () {
  fs.mkdir( path.resolve(tmp, 'Interfaces', 'empty_C3_interface', 'Utils'), function (e) { if(e){return err(e)} chain[step++]() });
});




chain.push(function createXSD1 () {
  fs.writeFile( path.resolve(tmp, 'adlcp_rootv1p2.xsd'),
 '<?xml version="1.0"?>\r\n'
+'<!-- filename=adlcp_rootv1p2.xsd -->\r\n'
+'<!-- Conforms to w3c http://www.w3.org/TR/xmlschema-1/ 2000-10-24-->\r\n'
+'\r\n'
+'<xsd:schema xmlns="http://www.adlnet.org/xsd/adlcp_rootv1p2"\r\n'
+'            targetNamespace="http://www.adlnet.org/xsd/adlcp_rootv1p2"\r\n'
+'            xmlns:xml="http://www.w3.org/XML/1998/namespace"\r\n'
+'            xmlns:imscp="http://www.imsproject.org/xsd/imscp_rootv1p1p2"\r\n'
+'            xmlns:xsd="http://www.w3.org/2001/XMLSchema"\r\n'
+'            elementFormDefault="unqualified"\r\n'
+'            version="ADL Version 1.2">\r\n'
+'\r\n'
+'        <xsd:import namespace="http://www.imsproject.org/xsd/imscp_rootv1p1p2"\r\n'
+'         schemaLocation="imscp_rootv1p1p2.xsd"/>\r\n'
+'\r\n'
+'        <xsd:element name="location" type="locationType"/>\r\n'
+'        <xsd:element name="prerequisites" type="prerequisitesType"/>\r\n'
+'        <xsd:element name="maxtimeallowed" type="maxtimeallowedType"/>\r\n'
+'        <xsd:element name="timelimitaction" type="timelimitactionType"/>\r\n'
+'        <xsd:element name="datafromlms" type="datafromlmsType"/>\r\n'
+'        <xsd:element name="masteryscore" type="masteryscoreType"/>\r\n'
+'\r\n'
+'\r\n'
+'        <xsd:element name="schema" type="newSchemaType"/>\r\n'
+'        <xsd:simpleType name="newSchemaType">\r\n'
+'                <xsd:restriction base="imscp:schemaType">\r\n'
+'                        <xsd:enumeration value="ADL SCORM"/>\r\n'
+'                </xsd:restriction>\r\n'
+'        </xsd:simpleType>\r\n'
+'\r\n'
+'        <xsd:element name="schemaversion" type="newSchemaversionType"/>\r\n'
+'        <xsd:simpleType name="newSchemaversionType">\r\n'
+'                <xsd:restriction base="imscp:schemaversionType">\r\n'
+'                        <xsd:enumeration value="1.2"/>\r\n'
+'                </xsd:restriction>\r\n'
+'        </xsd:simpleType>\r\n'
+'\r\n'
+'\r\n'
+'        <xsd:attribute name="scormtype">\r\n'
+'            <xsd:simpleType>\r\n'
+'                <xsd:restriction base="xsd:string">\r\n'
+'                   <xsd:enumeration value="asset"/>\r\n'
+'                   <xsd:enumeration value="sco"/>\r\n'
+'                </xsd:restriction>\r\n'
+'            </xsd:simpleType>\r\n'
+'        </xsd:attribute>\r\n'
+'\r\n'
+'        <xsd:simpleType name="locationType">\r\n'
+'                <xsd:restriction base="xsd:string">\r\n'
+'                        <xsd:maxLength value="2000"/>\r\n'
+'                </xsd:restriction>\r\n'
+'        </xsd:simpleType>\r\n'
+'\r\n'
+'\r\n'
+'        <xsd:complexType name="prerequisitesType">\r\n'
+'           <xsd:simpleContent>\r\n'
+'              <xsd:extension base="prerequisiteStringType">\r\n'
+'                  <xsd:attributeGroup ref="attr.prerequisitetype"/>\r\n'
+'              </xsd:extension>\r\n'
+'           </xsd:simpleContent>\r\n'
+'        </xsd:complexType>\r\n'
+'\r\n'
+'        <xsd:attributeGroup name="attr.prerequisitetype">\r\n'
+'                <xsd:attribute name="type" use="required">\r\n'
+'                        <xsd:simpleType>\r\n'
+'                                <xsd:restriction base="xsd:string">\r\n'
+'                                   <xsd:enumeration value="aicc_script"/>\r\n'
+'                                </xsd:restriction>\r\n'
+'                        </xsd:simpleType>\r\n'
+'                </xsd:attribute>\r\n'
+'        </xsd:attributeGroup>\r\n'
+'\r\n'
+'        <xsd:simpleType name="maxtimeallowedType">\r\n'
+'                <xsd:restriction base="xsd:string">\r\n'
+'                        <xsd:maxLength value="13"/>\r\n'
+'                </xsd:restriction>\r\n'
+'        </xsd:simpleType>\r\n'
+'\r\n'
+'        <xsd:simpleType name="timelimitactionType">\r\n'
+'                <xsd:restriction base="stringType">\r\n'
+'                        <xsd:enumeration value="exit,no message"/>\r\n'
+'                        <xsd:enumeration value="exit,message"/>\r\n'
+'                        <xsd:enumeration value="continue,no message"/>\r\n'
+'                        <xsd:enumeration value="continue,message"/>\r\n'
+'                </xsd:restriction>\r\n'
+'        </xsd:simpleType>\r\n'
+'\r\n'
+'        <xsd:simpleType name="datafromlmsType">\r\n'
+'                <xsd:restriction base="xsd:string">\r\n'
+'                        <xsd:maxLength value="255"/>\r\n'
+'                </xsd:restriction>\r\n'
+'        </xsd:simpleType>\r\n'
+'\r\n'
+'        <xsd:simpleType name="masteryscoreType">\r\n'
+'                <xsd:restriction base="xsd:string">\r\n'
+'                        <xsd:maxLength value="200"/>\r\n'
+'                </xsd:restriction>\r\n'
+'        </xsd:simpleType>\r\n'
+'\r\n'
+'        <xsd:simpleType name="stringType">\r\n'
+'                <xsd:restriction base="xsd:string"/>\r\n'
+'        </xsd:simpleType>\r\n'
+'        \r\n'
+'        <xsd:simpleType name="prerequisiteStringType">\r\n'
+'                <xsd:restriction base="xsd:string">\r\n'
+'                   <xsd:maxLength value="200"/>\r\n'
+'                </xsd:restriction>\r\n'
+'        </xsd:simpleType>\r\n'
+'\r\n'
+'</xsd:schema>\r\n'
+''
  , function (e) { if(e){return err(e)} chain[step++]() });

});



chain.push(function createXSD2 () {
  fs.writeFile( path.resolve(tmp, 'ims_xml.xsd'),
 '<?xml version="1.0" encoding="UTF-8"?>\r'
+'<!-- filename=ims_xml.xsd -->\r'
+'<xsd:schema xmlns="http://www.w3.org/XML/1998/namespace" \r'
+'            targetNamespace="http://www.w3.org/XML/1998/namespace" \r'
+'            xmlns:xsd="http://www.w3.org/2001/XMLSchema" \r'
+'            elementFormDefault="qualified">\r'
+'\t<!-- 2001-02-22 edited by Thomas Wason IMS Global Learning Consortium, Inc. -->\r'
+'\t<xsd:annotation>\r'
+'\t\t<xsd:documentation>In namespace-aware XML processors, the &quot;xml&quot; prefix is bound to the namespace name http://www.w3.org/XML/1998/namespace.</xsd:documentation>\r'
+'\t\t<xsd:documentation>Do not \'reference\' this \\file in XML instances</xsd:documentation>\r'
+'                <xsd:documentation>Schawn Thropp: \\\\Changed the uriReference type to string type</xsd:documentation>\r'
+'\t</xsd:annotation>\r'
+'\t<xsd:attribute name="lang" type="xsd:language">\r'
+'\t\t<xsd:annotation>\r'
+'\t\t\t<xsd:documentation>Refers to universal  XML 1.0 lang attribute</xsd:documentation>\r'
+'\t\t</xsd:annotation>\r'
+'\t</xsd:attribute>\r'
+'\t<xsd:attribute name="base" type="xsd:string">\r'
+'\t\t<xsd:annotation>\r'
+'\t\t\t<xsd:documentation>Refers to XML Base: http://www.w3.org/TR/xmlbase</xsd:documentation>\r'
+'\t\t</xsd:annotation>\r'
+'\t</xsd:attribute>\r'
+'\t<xsd:attribute name="link" type="xsd:string"/>\r'
+'</xsd:schema>\r'
+''
  , function (e) { if(e){return err(e)} chain[step++]() });

});



chain.push(function createXSD3 () {
  fs.writeFile( path.resolve(tmp, 'imscp_rootv1p1p2.xsd'),
 '<?xml version="1.0"?>\r\n'
+'\r\n'
+'<!-- edited with XML Spy v3.5 (http://www.xmlspy.com) by Thomas Wason (private) -->\r\n'
+'<!-- filename=ims_cp_rootv1p1p2.xsd -->\r\n'
+'<!-- Copyright (2) 2001 IMS Global Learning Consortium, Inc. -->\r\n'
+'<!-- edited by Thomas Wason  -->\r\n'
+'<!-- Conforms to w3c http://www.w3.org/TR/xmlschema-1/ 2000-10-24-->\r\n'
+'\r\n'
+'<xsd:schema xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" \r\n'
+'            targetNamespace="http://www.imsproject.org/xsd/imscp_rootv1p1p2" \r\n'
+'            xmlns:xml="http://www.w3.org/XML/1998/namespace" \r\n'
+'            xmlns:xsd="http://www.w3.org/2001/XMLSchema" \r\n'
+'            elementFormDefault="unqualified" version="IMS CP 1.1.2">\r\n'
+'\r\n'
+'   <!-- ******************** -->\r\n'
+'   <!-- ** Change History ** -->\r\n'
+'   <!-- ******************** -->\r\n'
+'   <xsd:annotation>\r\n'
+'      <xsd:documentation xml:lang="en">DRAFT XSD for IMS Content Packaging version 1.1 DRAFT</xsd:documentation>\r\n'
+'      <xsd:documentation> Copyright (c) 2001 IMS GLC, Inc. </xsd:documentation>\r\n'
+'      <xsd:documentation>2000-04-21, Adjustments by T.D. Wason from CP 1.0.</xsd:documentation>\r\n'
+'      <xsd:documentation>2001-02-22, T.D.Wason: Modify for 2000-10-24 XML-Schema version.  Modified to support extension.</xsd:documentation>\r\n'
+'      <xsd:documentation>2001-03-12, T.D.Wason: Change filename, target and meta-data namespaces and meta-data fielname.  Add meta-data to itemType, fileType and organizationType.</xsd:documentation>\r\n'
+'      <xsd:documentation>Do not define namespaces for xml in XML instances generated from this xsd.</xsd:documentation>\r\n'
+'      <xsd:documentation>Imports IMS meta-data xsd, lower case element names.         </xsd:documentation>\r\n'
+'      <xsd:documentation>This XSD provides a reference to the IMS meta-data root element as imsmd:record</xsd:documentation>\r\n'
+'      <xsd:documentation>If the IMS meta-data is to be used in the XML instance then the instance must define an IMS meta-data prefix with a namespace.  The meta-data targetNamespace should be used.  </xsd:documentation>\r\n'
+'      <xsd:documentation>2001-03-20, Thor Anderson: Remove manifestref, change resourceref back to identifierref, change manifest back to contained by manifest. --Tom Wason: manifest may contain _none_ or more manifests.</xsd:documentation>\r\n'
+'      <xsd:documentation>2001-04-13 Tom Wason: corrected attirbute name structure.  Was misnamed type.  </xsd:documentation>\r\n'
+'      <xsd:documentation>2001-05-14 Schawn Thropp: Made all complexType extensible with the group.any</xsd:documentation>\r\n'
+'      <xsd:documentation>Added the anyAttribute to all complexTypes. Changed the href attribute on the fileType and resourceType to xsd:string</xsd:documentation>\r\n'
+'      <xsd:documentation>Changed the maxLength of the href, identifierref, parameters, structure attributes to match the Information model.</xsd:documentation>\r\n'
+'      <xsd:documentation>2001-07-25 Schawn Thropp: Changed the namespace for the Schema of Schemas to the 5/2/2001 W3C XML Schema</xsd:documentation> \r\n'
+'      <xsd:documentation>Recommendation. attributeGroup attr.imsmd deleted, was not used anywhere.  Any attribute declarations that have</xsd:documentation>\r\n'
+'      <xsd:documentation>use = "default" changed to use="optional" - attr.structure.req.</xsd:documentation>\r\n'
+'      <xsd:documentation>Any attribute declarations that have value="somevalue" changed to default="somevalue",</xsd:documentation>\r\n'
+'      <xsd:documentation>attr.structure.req (hierarchical).  Removed references to IMS MD Version 1.1.</xsd:documentation>\r\n'
+'      <xsd:documentation>Modified attribute group "attr.resourcetype.req" to change use from optional</xsd:documentation>\r\n'
+'      <xsd:documentation>to required to match the information model.  As a result the default value also needed to be removed</xsd:documentation> \r\n'
+'      <xsd:documentation>Name change for XSD.  Changed to match version of CP Spec                                           </xsd:documentation> \r\n'
+'   </xsd:annotation>\r\n'
+'\r\n'
+'   <xsd:annotation>\r\n'
+'      <xsd:documentation>Inclusions and Imports</xsd:documentation>\r\n'
+'   </xsd:annotation>\r\n'
+'\r\n'
+'   <xsd:import namespace="http://www.w3.org/XML/1998/namespace" schemaLocation="ims_xml.xsd"/>\r\n'
+'\r\n'
+'   <xsd:annotation>\r\n'
+'      <xsd:documentation>Attribute Declarations</xsd:documentation>\r\n'
+'   </xsd:annotation>\r\n'
+'\r\n'
+'   <!-- **************************** -->\r\n'
+'   <!-- ** Attribute Declarations ** -->\r\n'
+'   <!-- **************************** -->\r\n'
+'   <xsd:attributeGroup name="attr.base">\r\n'
+'      <xsd:attribute ref="xml:base" use="optional"/>\r\n'
+'   </xsd:attributeGroup>\r\n'
+'\r\n'
+'   <xsd:attributeGroup name="attr.default">\r\n'
+'      <xsd:attribute name="default" type="xsd:IDREF" use="optional"/>\r\n'
+'   </xsd:attributeGroup>\r\n'
+'\r\n'
+'   <xsd:attributeGroup name="attr.href">\r\n'
+'      <xsd:attribute name="href" use="optional">\r\n'
+'         <xsd:simpleType>\r\n'
+'            <xsd:restriction base="xsd:anyURI">\r\n'
+'               <xsd:maxLength value="2000"/>\r\n'
+'            </xsd:restriction>\r\n'
+'         </xsd:simpleType>\r\n'
+'      </xsd:attribute>\r\n'
+'   </xsd:attributeGroup>\r\n'
+'\r\n'
+'   <xsd:attributeGroup name="attr.href.req">\r\n'
+'      <xsd:attribute name="href" use="required">\r\n'
+'         <xsd:simpleType>\r\n'
+'            <xsd:restriction base="xsd:anyURI">\r\n'
+'               <xsd:maxLength value="2000"/>\r\n'
+'            </xsd:restriction>\r\n'
+'         </xsd:simpleType>\r\n'
+'      </xsd:attribute>\r\n'
+'   </xsd:attributeGroup> \r\n'
+'\r\n'
+'   <xsd:attributeGroup name="attr.identifier.req">\r\n'
+'      <xsd:attribute name="identifier" type="xsd:ID" use="required"/>\r\n'
+'   </xsd:attributeGroup>\r\n'
+'\r\n'
+'   <xsd:attributeGroup name="attr.identifier">\r\n'
+'      <xsd:attribute name="identifier" type="xsd:ID" use="optional"/>\r\n'
+'   </xsd:attributeGroup>\r\n'
+'\r\n'
+'   <xsd:attributeGroup name="attr.isvisible">\r\n'
+'      <xsd:attribute name="isvisible" type="xsd:boolean" use="optional"/>\r\n'
+'   </xsd:attributeGroup>\r\n'
+'   \r\n'
+'   <xsd:attributeGroup name="attr.parameters">\r\n'
+'      <xsd:attribute name="parameters" use="optional">\r\n'
+'         <xsd:simpleType>\r\n'
+'            <xsd:restriction base="xsd:string">\r\n'
+'               <xsd:maxLength value="1000"/>\r\n'
+'            </xsd:restriction>\r\n'
+'         </xsd:simpleType>\r\n'
+'      </xsd:attribute>\r\n'
+'   </xsd:attributeGroup>\r\n'
+'   \r\n'
+'   <xsd:attributeGroup name="attr.identifierref">\r\n'
+'      <xsd:attribute name="identifierref" use="optional">\r\n'
+'         <xsd:simpleType>\r\n'
+'            <xsd:restriction base="xsd:string">\r\n'
+'               <xsd:maxLength value="2000"/>\r\n'
+'            </xsd:restriction>\r\n'
+'         </xsd:simpleType>\r\n'
+'      </xsd:attribute>\r\n'
+'   </xsd:attributeGroup>\r\n'
+'   \r\n'
+'   <xsd:attributeGroup name="attr.identifierref.req">\r\n'
+'      <xsd:attribute name="identifierref" use="required">\r\n'
+'         <xsd:simpleType>\r\n'
+'            <xsd:restriction base="xsd:string">\r\n'
+'               <xsd:maxLength value="2000"/>\r\n'
+'            </xsd:restriction>\r\n'
+'         </xsd:simpleType>\r\n'
+'      </xsd:attribute>\r\n'
+'   </xsd:attributeGroup>\r\n'
+'                \r\n'
+'   <xsd:attributeGroup name="attr.resourcetype.req">\r\n'
+'      <xsd:attribute name="type" use="required">\r\n'
+'         <xsd:simpleType>\r\n'
+'            <xsd:restriction base="xsd:string">\r\n'
+'               <xsd:maxLength value="1000"/>\r\n'
+'            </xsd:restriction>\r\n'
+'         </xsd:simpleType>\r\n'
+'      </xsd:attribute>\r\n'
+'   </xsd:attributeGroup>\r\n'
+'\r\n'
+'   <xsd:attributeGroup name="attr.structure.req">\r\n'
+'      <xsd:attribute name="structure" use="optional" default="hierarchical">\r\n'
+'         <xsd:simpleType>\r\n'
+'            <xsd:restriction base="xsd:string">\r\n'
+'               <xsd:maxLength value="200"/>\r\n'
+'            </xsd:restriction>\r\n'
+'         </xsd:simpleType>\r\n'
+'      </xsd:attribute>\r\n'
+'   </xsd:attributeGroup>\r\n'
+'\r\n'
+'   <xsd:attributeGroup name="attr.version">\r\n'
+'      <xsd:attribute name="version" use="optional">\r\n'
+'         <xsd:simpleType>\r\n'
+'            <xsd:restriction base="xsd:string">\r\n'
+'               <xsd:maxLength value="20"/>\r\n'
+'            </xsd:restriction>\r\n'
+'         </xsd:simpleType>\r\n'
+'      </xsd:attribute>\r\n'
+'   </xsd:attributeGroup>\r\n'
+'\r\n'
+'   <xsd:annotation>\r\n'
+'       <xsd:documentation>element groups</xsd:documentation>\r\n'
+'   </xsd:annotation>\r\n'
+'\r\n'
+'   <xsd:group name="grp.any">\r\n'
+'      <xsd:annotation>\r\n'
+'         <xsd:documentation>Any namespaced element from any namespace may be included within an &quot;any&quot; element.  The namespace for the imported element must be defined in the instance, and the schema must be imported.  </xsd:documentation>\r\n'
+'      </xsd:annotation>\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:any namespace="##other" processContents="strict" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:group>\r\n'
+'\r\n'
+'   <!-- ************************** -->\r\n'
+'   <!-- ** Element Declarations ** -->\r\n'
+'   <!-- ************************** -->\r\n'
+'\r\n'
+'   <xsd:element name="dependency" type="dependencyType"/>\r\n'
+'   <xsd:element name="file" type="fileType"/>\r\n'
+'   <xsd:element name="item" type="itemType"/>\r\n'
+'   <xsd:element name="manifest" type="manifestType"/>\r\n'
+'   <xsd:element name="metadata" type="metadataType"/>\r\n'
+'   <xsd:element name="organization" type="organizationType"/>\r\n'
+'   <xsd:element name="organizations" type="organizationsType"/>\r\n'
+'   <xsd:element name="resource" type="resourceType"/>\r\n'
+'   <xsd:element name="resources" type="resourcesType"/>\r\n'
+'   <xsd:element name="schema" type="schemaType"/>\r\n'
+'   <xsd:element name="schemaversion" type="schemaversionType"/>\r\n'
+'   <xsd:element name="title" type="titleType"/>\r\n'
+'\r\n'
+'   <!-- ******************* -->\r\n'
+'   <!-- ** Complex Types ** -->\r\n'
+'   <!-- ******************* -->\r\n'
+'\r\n'
+'   <!-- **************** -->\r\n'
+'   <!-- ** dependency ** -->\r\n'
+'   <!-- **************** -->\r\n'
+'   <xsd:complexType name="dependencyType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'      <xsd:attributeGroup ref="attr.identifierref.req"/>\r\n'
+'      <xsd:anyAttribute namespace="##other" processContents="strict"/>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <!-- ********** -->\r\n'
+'   <!-- ** file ** -->\r\n'
+'   <!-- ********** -->\r\n'
+'   <xsd:complexType name="fileType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="metadata" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'      <xsd:attributeGroup ref="attr.href.req"/>\r\n'
+'      <xsd:anyAttribute namespace="##other" processContents="strict"/>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <!-- ********** -->\r\n'
+'   <!-- ** item ** -->\r\n'
+'   <!-- ********** -->\r\n'
+'   <xsd:complexType name="itemType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="title" minOccurs="0"/>\r\n'
+'         <xsd:element ref="item" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="metadata" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'      <xsd:attributeGroup ref="attr.identifier.req"/>\r\n'
+'      <xsd:attributeGroup ref="attr.identifierref"/>\r\n'
+'      <xsd:attributeGroup ref="attr.isvisible"/>\r\n'
+'      <xsd:attributeGroup ref="attr.parameters"/>\r\n'
+'      <xsd:anyAttribute namespace="##other" processContents="strict"/>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <!-- ************** -->\r\n'
+'   <!-- ** manifest ** -->\r\n'
+'   <!-- ************** -->\r\n'
+'   <xsd:complexType name="manifestType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="metadata" minOccurs="0"/>\r\n'
+'         <xsd:element ref="organizations"/>\r\n'
+'         <xsd:element ref="resources"/>\r\n'
+'         <xsd:element ref="manifest" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'      <xsd:attributeGroup ref="attr.identifier.req"/>\r\n'
+'      <xsd:attributeGroup ref="attr.version"/>\r\n'
+'      <xsd:attribute ref="xml:base"/>\r\n'
+'      <xsd:anyAttribute namespace="##other" processContents="strict"/>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <!-- ************** -->\r\n'
+'   <!-- ** metadata ** -->\r\n'
+'   <!-- ************** -->\r\n'
+'   <xsd:complexType name="metadataType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="schema" minOccurs="0"/>\r\n'
+'         <xsd:element ref="schemaversion" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <!-- ******************* -->\r\n'
+'   <!-- ** organizations ** -->\r\n'
+'   <!-- ******************* -->\r\n'
+'   <xsd:complexType name="organizationsType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="organization" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'      <xsd:attributeGroup ref="attr.default"/>\r\n'
+'      <xsd:anyAttribute namespace="##other" processContents="strict"/>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <!-- ****************** -->\r\n'
+'   <!-- ** organization ** -->\r\n'
+'   <!-- ****************** -->\r\n'
+'   <xsd:complexType name="organizationType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="title" minOccurs="0"/>\r\n'
+'         <xsd:element ref="item" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="metadata" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'      <xsd:attributeGroup ref="attr.identifier.req"/>\r\n'
+'      <xsd:attributeGroup ref="attr.structure.req"/>\r\n'
+'      <xsd:anyAttribute namespace="##other" processContents="strict"/>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <!-- *************** -->\r\n'
+'   <!-- ** resources ** -->\r\n'
+'   <!-- *************** -->\r\n'
+'   <xsd:complexType name="resourcesType">\r\n'
+'      <xsd:sequence>\r\n'
+'          <xsd:element ref="resource" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'          <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'      <xsd:attributeGroup ref="attr.base"/>\r\n'
+'      <xsd:anyAttribute namespace="##other" processContents="strict"/>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <!-- ************** -->\r\n'
+'   <!-- ** resource ** -->\r\n'
+'   <!-- ************** -->\r\n'
+'   <xsd:complexType name="resourceType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="metadata" minOccurs="0"/>\r\n'
+'         <xsd:element ref="file" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="dependency" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'      <xsd:attributeGroup ref="attr.identifier.req"/>\r\n'
+'      <xsd:attributeGroup ref="attr.resourcetype.req"/>\r\n'
+'      <xsd:attributeGroup ref="attr.base"/>\r\n'
+'      <xsd:attributeGroup ref="attr.href"/>\r\n'
+'      <xsd:anyAttribute namespace="##other" processContents="strict"/>\r\n'
+'   </xsd:complexType>\r\n'
+'\r\n'
+'   <!-- ****************** -->\r\n'
+'   <!-- ** Simple Types ** -->\r\n'
+'   <!-- ****************** -->\r\n'
+'\r\n'
+'   <!-- ************ -->\r\n'
+'   <!-- ** schema ** -->\r\n'
+'   <!-- ************ -->\r\n'
+'   <xsd:simpleType name="schemaType">\r\n'
+'      <xsd:restriction base="xsd:string">\r\n'
+'         <xsd:maxLength value="100"/>\r\n'
+'      </xsd:restriction>\r\n'
+'   </xsd:simpleType>\r\n'
+'   \r\n'
+'   <!-- ******************* -->\r\n'
+'   <!-- ** schemaversion ** -->\r\n'
+'   <!-- ******************* -->\r\n'
+'   <xsd:simpleType name="schemaversionType">\r\n'
+'      <xsd:restriction base="xsd:string">\r\n'
+'         <xsd:maxLength value="20"/>\r\n'
+'      </xsd:restriction>\r\n'
+'   </xsd:simpleType>\r\n'
+'   \r\n'
+'   <!-- *********** -->\r\n'
+'   <!-- ** title ** -->\r\n'
+'   <!-- *********** -->\r\n'
+'   <xsd:simpleType name="titleType">\r\n'
+'      <xsd:restriction base="xsd:string">\r\n'
+'         <xsd:maxLength value="200"/>\r\n'
+'      </xsd:restriction>\r\n'
+'   </xsd:simpleType>\r\n'
+'\r\n'
+'</xsd:schema>\r\n'
+''
  , function (e) { if(e){return err(e)} chain[step++]() });

});



chain.push(function createXSD4 () {
  fs.writeFile( path.resolve(tmp, 'imsmd_rootv1p2.xsd'),
 '<?xml version="1.0" encoding="UTF-8"?>\r\n'
+'<!-- edited by Thomas Wason  -->\r\n'
+'<xsd:schema targetNamespace="http://www.imsproject.org/xsd/imsmd_rootv1p2" \r\n'
+'            xmlns:xml="http://www.w3.org/XML/1998/namespace" \r\n'
+'            xmlns:xsd="http://www.w3.org/2001/XMLSchema" \r\n'
+'            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" \r\n'
+'            xmlns="http://www.imsproject.org/xsd/imsmd_rootv1p2" \r\n'
+'            elementFormDefault="qualified" \r\n'
+'            version="1.2:1.1 IMS:MD1.2">\r\n'
+'\r\n'
+'   <xsd:import namespace="http://www.w3.org/XML/1998/namespace" schemaLocation="ims_xml.xsd"/> \r\n'
+'\r\n'
+'   <!-- ******************** -->\r\n'
+'   <!-- ** Change History ** -->\r\n'
+'   <!-- ******************** -->\r\n'
+'   <xsd:annotation>\r\n'
+'      <xsd:documentation>2001-04-26 T.D.Wason. IMS meta-data 1.2 XML-Schema.                                  </xsd:documentation>\r\n'
+'      <xsd:documentation>2001-06-07 S.E.Thropp. Changed the multiplicity on all elements to match the         </xsd:documentation>\r\n'
+'      <xsd:documentation>Final 1.2 Binding Specification.                                                     </xsd:documentation>\r\n'
+'      <xsd:documentation>Changed all elements that use the langstringType to a multiplicy of 1 or more        </xsd:documentation>\r\n'
+'      <xsd:documentation>Changed centity in the contribute element to have a multiplicity of 0 or more.       </xsd:documentation>\r\n'
+'      <xsd:documentation>Changed the requirement element to have a multiplicity of 0 or more.                 </xsd:documentation>\r\n'
+'      <xsd:documentation> 2001-07-25 Schawn Thropp.  Updates to bring the XSD up to speed with the W3C        </xsd:documentation>\r\n'
+'      <xsd:documentation> XML Schema Recommendation.  The following changes were made: Change the             </xsd:documentation>\r\n'
+'      <xsd:documentation> namespace to reference the 5/2/2001 W3C XML Schema Recommendation,the base          </xsd:documentation>\r\n'
+'      <xsd:documentation> type for the durtimeType, simpleType, was changed from timeDuration to duration.    </xsd:documentation>              \r\n'
+'      <xsd:documentation> Any attribute declarations that have use="default" had to change to use="optional"  </xsd:documentation>\r\n'
+'      <xsd:documentation> - attr.type.  Any attribute declarations that have value ="somevalue" had to change </xsd:documentation>\r\n'
+'      <xsd:documentation> to default = "somevalue" - attr.type (URI)                                          </xsd:documentation>\r\n'
+'   </xsd:annotation>\r\n'
+'\r\n'
+'   <!-- *************************** -->\r\n'
+'   <!-- ** Attribute Declaration ** -->\r\n'
+'   <!-- *************************** -->\r\n'
+'\r\n'
+'   <xsd:attributeGroup name="attr.type">\r\n'
+'      <xsd:attribute name="type" use="optional" default="URI">\r\n'
+'         <xsd:simpleType>\r\n'
+'            <xsd:restriction base="xsd:string">\r\n'
+'               <xsd:enumeration value="URI"/>\r\n'
+'               <xsd:enumeration value="TEXT"/>\r\n'
+'            </xsd:restriction>\r\n'
+'         </xsd:simpleType>\r\n'
+'      </xsd:attribute>\r\n'
+'   </xsd:attributeGroup>\r\n'
+'\r\n'
+'   <xsd:group name="grp.any">\r\n'
+'      <xsd:annotation>\r\n'
+'         <xsd:documentation>Any namespaced element from any namespace may be used for an &quot;any&quot; element.  The namespace for the imported element must be defined in the instance, and the schema must be imported.  </xsd:documentation>\r\n'
+'      </xsd:annotation>\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:any namespace="##any" processContents="strict" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:group>\r\n'
+'\r\n'
+'   <!-- ************************* -->\r\n'
+'   <!-- ** Element Declaration ** -->\r\n'
+'   <!-- ************************* -->\r\n'
+'\r\n'
+'   <xsd:element name="aggregationlevel" type="aggregationlevelType"/>\r\n'
+'   <xsd:element name="annotation" type="annotationType"/>\r\n'
+'   <xsd:element name="catalogentry" type="catalogentryType"/>\r\n'
+'   <xsd:element name="catalog" type="catalogType"/>\r\n'
+'   <xsd:element name="centity" type="centityType"/>\r\n'
+'   <xsd:element name="classification" type="classificationType"/>\r\n'
+'   <xsd:element name="context" type="contextType"/>\r\n'
+'   <xsd:element name="contribute" type="contributeType"/>\r\n'
+'   <xsd:element name="copyrightandotherrestrictions" type="copyrightandotherrestrictionsType"/>\r\n'
+'   <xsd:element name="cost" type="costType"/>\r\n'
+'   <xsd:element name="coverage" type="coverageType"/>\r\n'
+'   <xsd:element name="date" type="dateType"/>\r\n'
+'   <xsd:element name="datetime" type="datetimeType"/>\r\n'
+'   <xsd:element name="description" type="descriptionType"/>\r\n'
+'   <xsd:element name="difficulty" type="difficultyType"/>\r\n'
+'   <xsd:element name="educational" type="educationalType"/>\r\n'
+'   <xsd:element name="entry" type="entryType"/>\r\n'
+'   <xsd:element name="format" type="formatType"/>\r\n'
+'   <xsd:element name="general" type="generalType"/>\r\n'
+'   <xsd:element name="identifier" type="xsd:string"/>\r\n'
+'   <xsd:element name="intendedenduserrole" type="intendedenduserroleType"/>\r\n'
+'   <xsd:element name="interactivitylevel" type="interactivitylevelType"/>\r\n'
+'   <xsd:element name="interactivitytype" type="interactivitytypeType"/>\r\n'
+'   <xsd:element name="keyword" type="keywordType"/>\r\n'
+'   <xsd:element name="kind" type="kindType"/>\r\n'
+'   <xsd:element name="langstring" type="langstringType"/>\r\n'
+'   <xsd:element name="language" type="xsd:string"/>\r\n'
+'   <xsd:element name="learningresourcetype" type="learningresourcetypeType"/>\r\n'
+'   <xsd:element name="lifecycle" type="lifecycleType"/>\r\n'
+'   <xsd:element name="location" type="locationType"/>\r\n'
+'   <xsd:element name="lom" type="lomType"/>\r\n'
+'   <xsd:element name="maximumversion" type="minimumversionType"/>\r\n'
+'   <xsd:element name="metadatascheme" type="metadataschemeType"/>\r\n'
+'   <xsd:element name="metametadata" type="metametadataType"/>\r\n'
+'   <xsd:element name="minimumversion" type="maximumversionType"/>\r\n'
+'   <xsd:element name="name" type="nameType"/>\r\n'
+'   <xsd:element name="purpose" type="purposeType"/>\r\n'
+'   <xsd:element name="relation" type="relationType"/>\r\n'
+'   <xsd:element name="requirement" type="requirementType"/>\r\n'
+'   <xsd:element name="resource" type="resourceType"/>\r\n'
+'   <xsd:element name="rights" type="rightsType"/>\r\n'
+'   <xsd:element name="role" type="roleType"/>\r\n'
+'   <xsd:element name="semanticdensity" type="semanticdensityType"/>\r\n'
+'   <xsd:element name="size" type="sizeType"/>\r\n'
+'   <xsd:element name="source" type="sourceType"/>\r\n'
+'   <xsd:element name="status" type="statusType"/>\r\n'
+'   <xsd:element name="structure" type="structureType"/>\r\n'
+'   <xsd:element name="taxon" type="taxonType"/>\r\n'
+'   <xsd:element name="taxonpath" type="taxonpathType"/>\r\n'
+'   <xsd:element name="technical" type="technicalType"/>\r\n'
+'   <xsd:element name="title" type="titleType"/>\r\n'
+'   <xsd:element name="type" type="typeType"/>\r\n'
+'   <xsd:element name="typicalagerange" type="typicalagerangeType"/>\r\n'
+'   <xsd:element name="typicallearningtime" type="typicallearningtimeType"/>\r\n'
+'   <xsd:element name="value" type="valueType"/>\r\n'
+'   <xsd:element name="person" type="personType"/>\r\n'
+'   <xsd:element name="vcard" type="xsd:string"/>\r\n'
+'   <xsd:element name="version" type="versionType"/>\r\n'
+'   <xsd:element name="installationremarks" type="installationremarksType"/>\r\n'
+'   <xsd:element name="otherplatformrequirements" type="otherplatformrequirementsType"/>\r\n'
+'   <xsd:element name="duration" type="durationType"/>\r\n'
+'   <xsd:element name="id" type="idType"/>\r\n'
+'\r\n'
+'   <!-- ******************* -->\r\n'
+'   <!-- ** Complex Types ** -->\r\n'
+'   <!-- ******************* -->\r\n'
+'\r\n'
+'   <xsd:complexType name="aggregationlevelType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="annotationType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="person" minOccurs="0"/>\r\n'
+'         <xsd:element ref="date" minOccurs="0"/>\r\n'
+'         <xsd:element ref="description" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="catalogentryType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="catalog"/>\r\n'
+'         <xsd:element ref="entry"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="centityType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="vcard"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="classificationType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="purpose" minOccurs="0"/>\r\n'
+'         <xsd:element ref="taxonpath" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="description" minOccurs="0"/>\r\n'
+'         <xsd:element ref="keyword" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="contextType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="contributeType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="role"/>\r\n'
+'         <xsd:element ref="centity" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="date" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="copyrightandotherrestrictionsType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="costType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="coverageType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring" minOccurs="1" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="dateType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="datetime" minOccurs="0"/>\r\n'
+'         <xsd:element ref="description" minOccurs="0"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="descriptionType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring" minOccurs="1" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="difficultyType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="durationType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="datetime" minOccurs="0"/>\r\n'
+'         <xsd:element ref="description" minOccurs="0"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="educationalType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="interactivitytype" minOccurs="0"/>\r\n'
+'         <xsd:element ref="learningresourcetype" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="interactivitylevel" minOccurs="0"/>\r\n'
+'         <xsd:element ref="semanticdensity" minOccurs="0"/>\r\n'
+'         <xsd:element ref="intendedenduserrole" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="context" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="typicalagerange" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="difficulty" minOccurs="0"/>\r\n'
+'         <xsd:element ref="typicallearningtime" minOccurs="0"/>\r\n'
+'         <xsd:element ref="description" minOccurs="0"/>\r\n'
+'         <xsd:element ref="language" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="entryType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring" minOccurs="1" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="generalType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="identifier" minOccurs="0"/>\r\n'
+'         <xsd:element ref="title" minOccurs="0"/>\r\n'
+'         <xsd:element ref="catalogentry" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="language" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="description" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="keyword" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="coverage" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="structure" minOccurs="0"/>\r\n'
+'         <xsd:element ref="aggregationlevel" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="installationremarksType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring" minOccurs="1" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="intendedenduserroleType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="interactivitylevelType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="interactivitytypeType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="keywordType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring" minOccurs="1" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="kindType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="langstringType">\r\n'
+'      <xsd:simpleContent>\r\n'
+'         <xsd:extension base="xsd:string">\r\n'
+'            <xsd:attribute ref="xml:lang"/>\r\n'
+'         </xsd:extension>\r\n'
+'      </xsd:simpleContent>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="learningresourcetypeType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="lifecycleType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="version" minOccurs="0"/>\r\n'
+'         <xsd:element ref="status" minOccurs="0"/>\r\n'
+'         <xsd:element ref="contribute" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="locationType">\r\n'
+'      <xsd:simpleContent>\r\n'
+'         <xsd:extension base="xsd:string">\r\n'
+'            <xsd:attributeGroup ref="attr.type"/>\r\n'
+'         </xsd:extension>\r\n'
+'      </xsd:simpleContent>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="lomType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="general" minOccurs="0"/>\r\n'
+'         <xsd:element ref="lifecycle" minOccurs="0"/>\r\n'
+'         <xsd:element ref="metametadata" minOccurs="0"/>\r\n'
+'         <xsd:element ref="technical" minOccurs="0"/>\r\n'
+'         <xsd:element ref="educational" minOccurs="0"/>\r\n'
+'         <xsd:element ref="rights" minOccurs="0"/>\r\n'
+'         <xsd:element ref="relation" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="annotation" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="classification" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="metametadataType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="identifier" minOccurs="0"/>\r\n'
+'         <xsd:element ref="catalogentry" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="contribute" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="metadatascheme" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="language" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="nameType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="otherplatformrequirementsType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring" minOccurs="1" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="personType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="vcard"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="purposeType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="relationType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="kind" minOccurs="0"/>\r\n'
+'         <xsd:element ref="resource" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="requirementType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="type" minOccurs="0"/>\r\n'
+'         <xsd:element ref="name" minOccurs="0"/>\r\n'
+'         <xsd:element ref="minimumversion" minOccurs="0"/>\r\n'
+'         <xsd:element ref="maximumversion" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="resourceType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="identifier" minOccurs="0"/>\r\n'
+'         <xsd:element ref="description" minOccurs="0"/>\r\n'
+'         <xsd:element ref="catalogentry" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="rightsType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="cost" minOccurs="0"/>\r\n'
+'         <xsd:element ref="copyrightandotherrestrictions" minOccurs="0"/>\r\n'
+'         <xsd:element ref="description" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="roleType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="semanticdensityType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="sourceType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="statusType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="stringType">\r\n'
+'      <xsd:simpleContent>\r\n'
+'         <xsd:extension base="xsd:string">\r\n'
+'            <xsd:attribute ref="xml:lang"/>\r\n'
+'         </xsd:extension>\r\n'
+'      </xsd:simpleContent>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="structureType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="taxonpathType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source" minOccurs="0"/>\r\n'
+'         <xsd:element ref="taxon" minOccurs="0" maxOccurs="1"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="taxonType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="id" minOccurs="0"/>\r\n'
+'         <xsd:element ref="entry" minOccurs="0"/>\r\n'
+'         <xsd:element ref="taxon" minOccurs="0" maxOccurs="1"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="technicalType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="format" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="size" minOccurs="0"/>\r\n'
+'         <xsd:element ref="location" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="requirement" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="installationremarks" minOccurs="0"/>\r\n'
+'         <xsd:element ref="otherplatformrequirements" minOccurs="0"/>\r\n'
+'         <xsd:element ref="duration" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="titleType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring" minOccurs="1" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="typeType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="typicalagerangeType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring" minOccurs="1" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="typicallearningtimeType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="datetime" minOccurs="0"/>\r\n'
+'         <xsd:element ref="description" minOccurs="0"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="valueType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="versionType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring" minOccurs="1" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <!-- ****************** -->\r\n'
+'   <!-- ** Simple Types ** -->\r\n'
+'   <!-- ****************** -->\r\n'
+'   \r\n'
+'   <xsd:simpleType name="formatType">\r\n'
+'      <xsd:restriction base="xsd:string"/>\r\n'
+'   </xsd:simpleType>\r\n'
+'   \r\n'
+'   <xsd:simpleType name="sizeType">\r\n'
+'      <xsd:restriction base="xsd:int"/>\r\n'
+'   </xsd:simpleType>\r\n'
+'   \r\n'
+'   <xsd:simpleType name="datetimeType">\r\n'
+'      <xsd:restriction base="xsd:string"/>\r\n'
+'   </xsd:simpleType>\r\n'
+'   \r\n'
+'   <xsd:simpleType name="idType">\r\n'
+'      <xsd:restriction base="xsd:string"/>\r\n'
+'   </xsd:simpleType>\r\n'
+'   \r\n'
+'   <xsd:simpleType name="metadataschemeType">\r\n'
+'      <xsd:restriction base="xsd:string"/>\r\n'
+'   </xsd:simpleType>\r\n'
+'   \r\n'
+'   <xsd:simpleType name="catalogType">\r\n'
+'      <xsd:restriction base="xsd:string"/>\r\n'
+'   </xsd:simpleType>\r\n'
+'   \r\n'
+'   <xsd:simpleType name="minimumversionType">\r\n'
+'      <xsd:restriction base="xsd:string"/>\r\n'
+'   </xsd:simpleType>\r\n'
+'   \r\n'
+'   <xsd:simpleType name="maximumversionType">\r\n'
+'      <xsd:restriction base="xsd:string"/>\r\n'
+'   </xsd:simpleType>\r\n'
+'\r\n'
+'</xsd:schema>\r\n'
+''
  , function (e) { if(e){return err(e)} chain[step++]() });

});



chain.push(function createXSD5 () {
  fs.writeFile( path.resolve(tmp, 'imsmd_rootv1p2p1.xsd'),
 '<?xml version="1.0" encoding="UTF-8"?>\r\n'
+'<!-- edited by Thomas Wason  -->\r\n'
+'<xsd:schema targetNamespace="http://www.imsglobal.org/xsd/imsmd_rootv1p2p1" \r\n'
+'            xmlns:xml="http://www.w3.org/XML/1998/namespace" \r\n'
+'            xmlns:xsd="http://www.w3.org/2001/XMLSchema" \r\n'
+'            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" \r\n'
+'            xmlns="http://www.imsglobal.org/xsd/imsmd_rootv1p2p1" \r\n'
+'            elementFormDefault="qualified" \r\n'
+'            version="1.2:1.1 IMS:MD1.2">\r\n'
+'\r\n'
+'   <xsd:import namespace="http://www.w3.org/XML/1998/namespace" schemaLocation="ims_xml.xsd"/> \r\n'
+'\r\n'
+'   <!-- ******************** -->\r\n'
+'   <!-- ** Change History ** -->\r\n'
+'   <!-- ******************** -->\r\n'
+'   <xsd:annotation>\r\n'
+'      <xsd:documentation>2001-04-26 T.D.Wason. IMS meta-data 1.2 XML-Schema.                                  </xsd:documentation>\r\n'
+'      <xsd:documentation>2001-06-07 S.E.Thropp. Changed the multiplicity on all elements to match the         </xsd:documentation>\r\n'
+'      <xsd:documentation>Final 1.2 Binding Specification.                                                     </xsd:documentation>\r\n'
+'      <xsd:documentation>Changed all elements that use the langstringType to a multiplicy of 1 or more        </xsd:documentation>\r\n'
+'      <xsd:documentation>Changed centity in the contribute element to have a multiplicity of 0 or more.       </xsd:documentation>\r\n'
+'      <xsd:documentation>Changed the requirement element to have a multiplicity of 0 or more.                 </xsd:documentation>\r\n'
+'      <xsd:documentation> 2001-07-25 Schawn Thropp.  Updates to bring the XSD up to speed with the W3C        </xsd:documentation>\r\n'
+'      <xsd:documentation> XML Schema Recommendation.  The following changes were made: Change the             </xsd:documentation>\r\n'
+'      <xsd:documentation> namespace to reference the 5/2/2001 W3C XML Schema Recommendation,the base          </xsd:documentation>\r\n'
+'      <xsd:documentation> type for the durtimeType, simpleType, was changed from timeDuration to duration.    </xsd:documentation>              \r\n'
+'      <xsd:documentation> Any attribute declarations that have use="default" had to change to use="optional"  </xsd:documentation>\r\n'
+'      <xsd:documentation> - attr.type.  Any attribute declarations that have value ="somevalue" had to change </xsd:documentation>\r\n'
+'      <xsd:documentation> to default = "somevalue" - attr.type (URI)                                          </xsd:documentation>\r\n'
+'      <xsd:documentation> 2001-09-04 Schawn Thropp                                                            </xsd:documentation>\r\n'
+'      <xsd:documentation> Changed the targetNamespace and namespace of schema to reflect version change       </xsd:documentation>\r\n'
+'   </xsd:annotation>\r\n'
+'\r\n'
+'   <!-- *************************** -->\r\n'
+'   <!-- ** Attribute Declaration ** -->\r\n'
+'   <!-- *************************** -->\r\n'
+'\r\n'
+'   <xsd:attributeGroup name="attr.type">\r\n'
+'      <xsd:attribute name="type" use="optional" default="URI">\r\n'
+'         <xsd:simpleType>\r\n'
+'            <xsd:restriction base="xsd:string">\r\n'
+'               <xsd:enumeration value="URI"/>\r\n'
+'               <xsd:enumeration value="TEXT"/>\r\n'
+'            </xsd:restriction>\r\n'
+'         </xsd:simpleType>\r\n'
+'      </xsd:attribute>\r\n'
+'   </xsd:attributeGroup>\r\n'
+'\r\n'
+'   <xsd:group name="grp.any">\r\n'
+'      <xsd:annotation>\r\n'
+'         <xsd:documentation>Any namespaced element from any namespace may be used for an &quot;any&quot; element.  The namespace for the imported element must be defined in the instance, and the schema must be imported.  </xsd:documentation>\r\n'
+'      </xsd:annotation>\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:any namespace="##any" processContents="strict" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:group>\r\n'
+'\r\n'
+'   <!-- ************************* -->\r\n'
+'   <!-- ** Element Declaration ** -->\r\n'
+'   <!-- ************************* -->\r\n'
+'\r\n'
+'   <xsd:element name="aggregationlevel" type="aggregationlevelType"/>\r\n'
+'   <xsd:element name="annotation" type="annotationType"/>\r\n'
+'   <xsd:element name="catalogentry" type="catalogentryType"/>\r\n'
+'   <xsd:element name="catalog" type="catalogType"/>\r\n'
+'   <xsd:element name="centity" type="centityType"/>\r\n'
+'   <xsd:element name="classification" type="classificationType"/>\r\n'
+'   <xsd:element name="context" type="contextType"/>\r\n'
+'   <xsd:element name="contribute" type="contributeType"/>\r\n'
+'   <xsd:element name="copyrightandotherrestrictions" type="copyrightandotherrestrictionsType"/>\r\n'
+'   <xsd:element name="cost" type="costType"/>\r\n'
+'   <xsd:element name="coverage" type="coverageType"/>\r\n'
+'   <xsd:element name="date" type="dateType"/>\r\n'
+'   <xsd:element name="datetime" type="datetimeType"/>\r\n'
+'   <xsd:element name="description" type="descriptionType"/>\r\n'
+'   <xsd:element name="difficulty" type="difficultyType"/>\r\n'
+'   <xsd:element name="educational" type="educationalType"/>\r\n'
+'   <xsd:element name="entry" type="entryType"/>\r\n'
+'   <xsd:element name="format" type="formatType"/>\r\n'
+'   <xsd:element name="general" type="generalType"/>\r\n'
+'   <xsd:element name="identifier" type="xsd:string"/>\r\n'
+'   <xsd:element name="intendedenduserrole" type="intendedenduserroleType"/>\r\n'
+'   <xsd:element name="interactivitylevel" type="interactivitylevelType"/>\r\n'
+'   <xsd:element name="interactivitytype" type="interactivitytypeType"/>\r\n'
+'   <xsd:element name="keyword" type="keywordType"/>\r\n'
+'   <xsd:element name="kind" type="kindType"/>\r\n'
+'   <xsd:element name="langstring" type="langstringType"/>\r\n'
+'   <xsd:element name="language" type="xsd:string"/>\r\n'
+'   <xsd:element name="learningresourcetype" type="learningresourcetypeType"/>\r\n'
+'   <xsd:element name="lifecycle" type="lifecycleType"/>\r\n'
+'   <xsd:element name="location" type="locationType"/>\r\n'
+'   <xsd:element name="lom" type="lomType"/>\r\n'
+'   <xsd:element name="maximumversion" type="minimumversionType"/>\r\n'
+'   <xsd:element name="metadatascheme" type="metadataschemeType"/>\r\n'
+'   <xsd:element name="metametadata" type="metametadataType"/>\r\n'
+'   <xsd:element name="minimumversion" type="maximumversionType"/>\r\n'
+'   <xsd:element name="name" type="nameType"/>\r\n'
+'   <xsd:element name="purpose" type="purposeType"/>\r\n'
+'   <xsd:element name="relation" type="relationType"/>\r\n'
+'   <xsd:element name="requirement" type="requirementType"/>\r\n'
+'   <xsd:element name="resource" type="resourceType"/>\r\n'
+'   <xsd:element name="rights" type="rightsType"/>\r\n'
+'   <xsd:element name="role" type="roleType"/>\r\n'
+'   <xsd:element name="semanticdensity" type="semanticdensityType"/>\r\n'
+'   <xsd:element name="size" type="sizeType"/>\r\n'
+'   <xsd:element name="source" type="sourceType"/>\r\n'
+'   <xsd:element name="status" type="statusType"/>\r\n'
+'   <xsd:element name="structure" type="structureType"/>\r\n'
+'   <xsd:element name="taxon" type="taxonType"/>\r\n'
+'   <xsd:element name="taxonpath" type="taxonpathType"/>\r\n'
+'   <xsd:element name="technical" type="technicalType"/>\r\n'
+'   <xsd:element name="title" type="titleType"/>\r\n'
+'   <xsd:element name="type" type="typeType"/>\r\n'
+'   <xsd:element name="typicalagerange" type="typicalagerangeType"/>\r\n'
+'   <xsd:element name="typicallearningtime" type="typicallearningtimeType"/>\r\n'
+'   <xsd:element name="value" type="valueType"/>\r\n'
+'   <xsd:element name="person" type="personType"/>\r\n'
+'   <xsd:element name="vcard" type="xsd:string"/>\r\n'
+'   <xsd:element name="version" type="versionType"/>\r\n'
+'   <xsd:element name="installationremarks" type="installationremarksType"/>\r\n'
+'   <xsd:element name="otherplatformrequirements" type="otherplatformrequirementsType"/>\r\n'
+'   <xsd:element name="duration" type="durationType"/>\r\n'
+'   <xsd:element name="id" type="idType"/>\r\n'
+'\r\n'
+'   <!-- ******************* -->\r\n'
+'   <!-- ** Complex Types ** -->\r\n'
+'   <!-- ******************* -->\r\n'
+'\r\n'
+'   <xsd:complexType name="aggregationlevelType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="annotationType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="person" minOccurs="0"/>\r\n'
+'         <xsd:element ref="date" minOccurs="0"/>\r\n'
+'         <xsd:element ref="description" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="catalogentryType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="catalog"/>\r\n'
+'         <xsd:element ref="entry"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="centityType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="vcard"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="classificationType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="purpose" minOccurs="0"/>\r\n'
+'         <xsd:element ref="taxonpath" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="description" minOccurs="0"/>\r\n'
+'         <xsd:element ref="keyword" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="contextType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="contributeType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="role"/>\r\n'
+'         <xsd:element ref="centity" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="date" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="copyrightandotherrestrictionsType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="costType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="coverageType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring" minOccurs="1" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="dateType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="datetime" minOccurs="0"/>\r\n'
+'         <xsd:element ref="description" minOccurs="0"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="descriptionType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring" minOccurs="1" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="difficultyType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="durationType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="datetime" minOccurs="0"/>\r\n'
+'         <xsd:element ref="description" minOccurs="0"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="educationalType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="interactivitytype" minOccurs="0"/>\r\n'
+'         <xsd:element ref="learningresourcetype" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="interactivitylevel" minOccurs="0"/>\r\n'
+'         <xsd:element ref="semanticdensity" minOccurs="0"/>\r\n'
+'         <xsd:element ref="intendedenduserrole" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="context" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="typicalagerange" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="difficulty" minOccurs="0"/>\r\n'
+'         <xsd:element ref="typicallearningtime" minOccurs="0"/>\r\n'
+'         <xsd:element ref="description" minOccurs="0"/>\r\n'
+'         <xsd:element ref="language" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="entryType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring" minOccurs="1" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="generalType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="identifier" minOccurs="0"/>\r\n'
+'         <xsd:element ref="title" minOccurs="0"/>\r\n'
+'         <xsd:element ref="catalogentry" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="language" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="description" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="keyword" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="coverage" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="structure" minOccurs="0"/>\r\n'
+'         <xsd:element ref="aggregationlevel" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="installationremarksType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring" minOccurs="1" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="intendedenduserroleType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="interactivitylevelType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="interactivitytypeType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="keywordType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring" minOccurs="1" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="kindType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="langstringType">\r\n'
+'      <xsd:simpleContent>\r\n'
+'         <xsd:extension base="xsd:string">\r\n'
+'            <xsd:attribute ref="xml:lang"/>\r\n'
+'         </xsd:extension>\r\n'
+'      </xsd:simpleContent>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="learningresourcetypeType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="lifecycleType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="version" minOccurs="0"/>\r\n'
+'         <xsd:element ref="status" minOccurs="0"/>\r\n'
+'         <xsd:element ref="contribute" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="locationType">\r\n'
+'      <xsd:simpleContent>\r\n'
+'         <xsd:extension base="xsd:string">\r\n'
+'            <xsd:attributeGroup ref="attr.type"/>\r\n'
+'         </xsd:extension>\r\n'
+'      </xsd:simpleContent>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="lomType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="general" minOccurs="0"/>\r\n'
+'         <xsd:element ref="lifecycle" minOccurs="0"/>\r\n'
+'         <xsd:element ref="metametadata" minOccurs="0"/>\r\n'
+'         <xsd:element ref="technical" minOccurs="0"/>\r\n'
+'         <xsd:element ref="educational" minOccurs="0"/>\r\n'
+'         <xsd:element ref="rights" minOccurs="0"/>\r\n'
+'         <xsd:element ref="relation" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="annotation" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="classification" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="metametadataType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="identifier" minOccurs="0"/>\r\n'
+'         <xsd:element ref="catalogentry" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="contribute" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="metadatascheme" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="language" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="nameType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="otherplatformrequirementsType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring" minOccurs="1" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="personType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="vcard"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="purposeType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="relationType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="kind" minOccurs="0"/>\r\n'
+'         <xsd:element ref="resource" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="requirementType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="type" minOccurs="0"/>\r\n'
+'         <xsd:element ref="name" minOccurs="0"/>\r\n'
+'         <xsd:element ref="minimumversion" minOccurs="0"/>\r\n'
+'         <xsd:element ref="maximumversion" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="resourceType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="identifier" minOccurs="0"/>\r\n'
+'         <xsd:element ref="description" minOccurs="0"/>\r\n'
+'         <xsd:element ref="catalogentry" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="rightsType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="cost" minOccurs="0"/>\r\n'
+'         <xsd:element ref="copyrightandotherrestrictions" minOccurs="0"/>\r\n'
+'         <xsd:element ref="description" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="roleType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="semanticdensityType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="sourceType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="statusType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="stringType">\r\n'
+'      <xsd:simpleContent>\r\n'
+'         <xsd:extension base="xsd:string">\r\n'
+'            <xsd:attribute ref="xml:lang"/>\r\n'
+'         </xsd:extension>\r\n'
+'      </xsd:simpleContent>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="structureType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="taxonpathType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source" minOccurs="0"/>\r\n'
+'         <xsd:element ref="taxon" minOccurs="0" maxOccurs="1"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="taxonType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="id" minOccurs="0"/>\r\n'
+'         <xsd:element ref="entry" minOccurs="0"/>\r\n'
+'         <xsd:element ref="taxon" minOccurs="0" maxOccurs="1"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="technicalType" mixed="true">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="format" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="size" minOccurs="0"/>\r\n'
+'         <xsd:element ref="location" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="requirement" minOccurs="0" maxOccurs="unbounded"/>\r\n'
+'         <xsd:element ref="installationremarks" minOccurs="0"/>\r\n'
+'         <xsd:element ref="otherplatformrequirements" minOccurs="0"/>\r\n'
+'         <xsd:element ref="duration" minOccurs="0"/>\r\n'
+'         <xsd:group ref="grp.any"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="titleType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring" minOccurs="1" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="typeType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="source"/>\r\n'
+'         <xsd:element ref="value"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="typicalagerangeType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring" minOccurs="1" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="typicallearningtimeType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="datetime" minOccurs="0"/>\r\n'
+'         <xsd:element ref="description" minOccurs="0"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="valueType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <xsd:complexType name="versionType">\r\n'
+'      <xsd:sequence>\r\n'
+'         <xsd:element ref="langstring" minOccurs="1" maxOccurs="unbounded"/>\r\n'
+'      </xsd:sequence>\r\n'
+'   </xsd:complexType>\r\n'
+'   \r\n'
+'   <!-- ****************** -->\r\n'
+'   <!-- ** Simple Types ** -->\r\n'
+'   <!-- ****************** -->\r\n'
+'   \r\n'
+'   <xsd:simpleType name="formatType">\r\n'
+'      <xsd:restriction base="xsd:string"/>\r\n'
+'   </xsd:simpleType>\r\n'
+'   \r\n'
+'   <xsd:simpleType name="sizeType">\r\n'
+'      <xsd:restriction base="xsd:int"/>\r\n'
+'   </xsd:simpleType>\r\n'
+'   \r\n'
+'   <xsd:simpleType name="datetimeType">\r\n'
+'      <xsd:restriction base="xsd:string"/>\r\n'
+'   </xsd:simpleType>\r\n'
+'   \r\n'
+'   <xsd:simpleType name="idType">\r\n'
+'      <xsd:restriction base="xsd:string"/>\r\n'
+'   </xsd:simpleType>\r\n'
+'   \r\n'
+'   <xsd:simpleType name="metadataschemeType">\r\n'
+'      <xsd:restriction base="xsd:string"/>\r\n'
+'   </xsd:simpleType>\r\n'
+'   \r\n'
+'   <xsd:simpleType name="catalogType">\r\n'
+'      <xsd:restriction base="xsd:string"/>\r\n'
+'   </xsd:simpleType>\r\n'
+'   \r\n'
+'   <xsd:simpleType name="minimumversionType">\r\n'
+'      <xsd:restriction base="xsd:string"/>\r\n'
+'   </xsd:simpleType>\r\n'
+'   \r\n'
+'   <xsd:simpleType name="maximumversionType">\r\n'
+'      <xsd:restriction base="xsd:string"/>\r\n'
+'   </xsd:simpleType>\r\n'
+'\r\n'
+'</xsd:schema>\r\n'
+''
  , function (e) { if(e){return err(e)} chain[step++]() });

});




chain.push(function createJS1 () {
  fs.writeFile( path.resolve(tmp, 'ICU_' + contentUuid, 'Media', 'All_Functions_1_2.js'),
 '/* This if for SCORM 1.2, adapted from SCORM 2004 2nd Ed., BUT not everything has been tested! */\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** FileName: APIWrapper.js\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Concurrent Technologies Corporation (CTC) grants you ("Licensee") a non-\r\n'
+'** exclusive, royalty free, license to use, modify and redistribute this\r\n'
+'** software in source and binary code form, provided that i) this copyright\r\n'
+'** notice and license appear on all copies of the software; and ii) Licensee does\r\n'
+'** not utilize the software in a manner which is disparaging to CTC.\r\n'
+'**\r\n'
+'** This software is provided "AS IS," without a warranty of any kind.  ALL\r\n'
+'** EXPRESS OR IMPLIED CONDITIONS, REPRESENTATIONS AND WARRANTIES, INCLUDING ANY\r\n'
+'** IMPLIED WARRANTY OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE OR NON-\r\n'
+'** INFRINGEMENT, ARE HEREBY EXCLUDED.  CTC AND ITS LICENSORS SHALL NOT BE LIABLE\r\n'
+'** FOR ANY DAMAGES SUFFERED BY LICENSEE AS A RESULT OF USING, MODIFYING OR\r\n'
+'** DISTRIBUTING THE SOFTWARE OR ITS DERIVATIVES.  IN NO EVENT WILL CTC  OR ITS\r\n'
+'** LICENSORS BE LIABLE FOR ANY LOST REVENUE, PROFIT OR DATA, OR FOR DIRECT,\r\n'
+'** INDIRECT, SPECIAL, CONSEQUENTIAL, INCIDENTAL OR PUNITIVE DAMAGES, HOWEVER\r\n'
+'** CAUSED AND REGARDLESS OF THE THEORY OF LIABILITY, ARISING OUT OF THE USE OF\r\n'
+'** OR INABILITY TO USE SOFTWARE, EVEN IF CTC  HAS BEEN ADVISED OF THE POSSIBILITY\r\n'
+'** OF SUCH DAMAGES.\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'** This file is part of the ADL Sample API Implementation intended to provide\r\n'
+'** an elementary example of the concepts presented in the ADL Sharable\r\n'
+'** Content Object Reference Model (SCORM).\r\n'
+'**\r\n'
+'** The purpose in wrapping the calls to the API is to (1) provide a\r\n'
+'** consistent means of finding the LMS API implementation within the window\r\n'
+'** hierarchy and (2) to validate that the data being exchanged via the\r\n'
+'** API conforms to the defined CMI data types.\r\n'
+'**\r\n'
+'** This is just one possible example for implementing the API guidelines for\r\n'
+'** runtime communication between an LMS and executable content components.\r\n'
+'** There are several other possible implementations.\r\n'
+'**\r\n'
+'** Usage: Executable course content can call the API Wrapper\r\n'
+'**      functions as follows:\r\n'
+'**\r\n'
+'**    javascript:\r\n'
+'**          var result = doInitialize();\r\n'
+'**          if (result != true) \r\n'
+'**          {\r\n'
+'**             // handle error\r\n'
+'**          }\r\n'
+'**\r\n'
+'**    authorware:\r\n'
+'**          result := ReadURL("javascript:doInitialize()", 100)\r\n'
+'**\r\n'
+'**    director:\r\n'
+'**          result = externalEvent("javascript:doInitialize()")\r\n'
+'**\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'\r\n'
+'var _Debug = false;  // set this to false to turn debugging off\r\n'
+'                     // and get rid of those annoying alert boxes.\r\n'
+'\r\n'
+'// Define exception/error codes\r\n'
+'var _NoError = 0;\r\n'
+'var _GeneralException = 101;\r\n'
+'var _GeneralInitializationFailure = 102;\r\n'
+'var _AlreadyInitialized = 103;\r\n'
+'var _ContentInstanceTerminated = 104;\r\n'
+'var _GeneralTerminationFailure = 111;\r\n'
+'var _TerminationBeforeInitialization = 112;\r\n'
+'var _TerminationAfterTermination = 113;\r\n'
+'var _ReceivedDataBeforeInitialization = 122;\r\n'
+'var _ReceivedDataAfterTermination = 123;\r\n'
+'var _StoreDataBeforeInitialization = 132;\r\n'
+'var _StoreDataAfterTermination = 133;\r\n'
+'var _CommitBeforeInitialization = 142;\r\n'
+'var _CommitAfterTermination = 143;\r\n'
+'var _GeneralArgumentError = 201;\r\n'
+'var _GeneralGetFailure = 301;\r\n'
+'var _GeneralSetFailure = 351;\r\n'
+'var _GeneralCommitFailure = 391;\r\n'
+'var _UndefinedDataModelElement = 401;\r\n'
+'var _UnimplementedDataModelElement = 402;\r\n'
+'var _DataModelElementValueNotInitialized = 403;\r\n'
+'var _DataModelElementIsReadOnly = 404;\r\n'
+'var _DataModelElementIsWriteOnly = 405;\r\n'
+'var _DataModelElementTypeMismatch = 406;\r\n'
+'var _DataModelElementValueOutOfRange = 407;\r\n'
+'\r\n'
+'\r\n'
+'// local variable definitions\r\n'
+'var apiHandle = null;\r\n'
+'var API = null;\r\n'
+'var findAPITries = 0;\r\n'
+'\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function: doInitialize()\r\n'
+'** Inputs:  None\r\n'
+'** Return:  CMIBoolean true if the initialization was successful, or\r\n'
+'**          CMIBoolean false if the initialization failed.\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Initialize communication with LMS by calling the Initialize\r\n'
+'** function which will be implemented by the LMS.\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function doInitialize()\r\n'
+'{\r\n'
+'   var api = getAPIHandle();\r\n'
+'   if (api == null)\r\n'
+'   {\r\n'
+'      alert("Unable to locate the LMS\'s API Implementation.\\nInitialize was not successful.");\r\n'
+'      return "false";\r\n'
+'   }\r\n'
+'\r\n'
+'   var result = api.LMSInitialize("");\r\n'
+'\r\n'
+'   if (result.toString() != "true")\r\n'
+'   {\r\n'
+'      var err = ErrorHandler();\r\n'
+'   }\r\n'
+'\r\n'
+'   return result.toString();\r\n'
+'}\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function doTerminate()\r\n'
+'** Inputs:  None\r\n'
+'** Return:  CMIBoolean true if successful\r\n'
+'**          CMIBoolean false if failed.\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Close communication with LMS by calling the Terminate\r\n'
+'** function which will be implemented by the LMS\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function doTerminate()\r\n'
+'{  \r\n'
+'   var api = getAPIHandle();\r\n'
+'   if (api == null)\r\n'
+'   {\r\n'
+'      alert("Unable to locate the LMS\'s API Implementation.\\nTerminate was not successful.");\r\n'
+'      return "false";\r\n'
+'   }\r\n'
+'   else\r\n'
+'   {\r\n'
+'      // call the Terminate function that should be implemented by the API\r\n'
+'\r\n'
+'      var result = api.LMSFinish("");\r\n'
+'      if (result.toString() != "true")\r\n'
+'      {\r\n'
+'         var err = ErrorHandler();\r\n'
+'      }\r\n'
+'\r\n'
+'   }\r\n'
+'\r\n'
+'   return result.toString();\r\n'
+'}\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function doGetValue(name)\r\n'
+'** Inputs:  name - string representing the cmi data model defined category or\r\n'
+'**             element (e.g. cmi.core.student_id)\r\n'
+'** Return:  The value presently assigned by the LMS to the cmi data model\r\n'
+'**       element defined by the element or category identified by the name\r\n'
+'**       input value.\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Wraps the call to the GetValue method\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function doGetValue(name)\r\n'
+'{\r\n'
+'   var api = getAPIHandle();\r\n'
+'   if (api == null)\r\n'
+'   {\r\n'
+'      alert("Unable to locate the LMS\'s API Implementation.\\nGetValue was not successful.");\r\n'
+'      return "";\r\n'
+'   }\r\n'
+'   else\r\n'
+'   {\r\n'
+'      var value = api.LMSGetValue(name);\r\n'
+'      var errCode = api.LMSGetLastError().toString();\r\n'
+'      if (errCode != _NoError)\r\n'
+'      {\r\n'
+'         // an error was encountered so display the error description\r\n'
+'         var errDescription = api.LMSGetErrorString(errCode);\r\n'
+'         alert("GetValue("+name+") failed. \\n"+ errDescription);\r\n'
+'         return "";\r\n'
+'      }\r\n'
+'      else\r\n'
+'      {\r\n'
+'         \r\n'
+'         return value.toString();\r\n'
+'      }\r\n'
+'   }\r\n'
+'}\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function doSetValue(name, value)\r\n'
+'** Inputs:  name -string representing the data model defined category or element\r\n'
+'**          value -the value that the named element or category will be assigned\r\n'
+'** Return:  CMIBoolean true if successful\r\n'
+'**          CMIBoolean false if failed.\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Wraps the call to the SetValue function\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function doSetValue(name, value)\r\n'
+'{  \r\n'
+'   var api = getAPIHandle();\r\n'
+'   if (api == null)\r\n'
+'   {\r\n'
+'      alert("Unable to locate the LMS\'s API Implementation.\\nSetValue was not successful.");\r\n'
+'      return;\r\n'
+'   }\r\n'
+'   else\r\n'
+'   {\r\n'
+'      var result = api.LMSSetValue(name, value);\r\n'
+'      if (result.toString() != "true")\r\n'
+'      {\r\n'
+'         var err = ErrorHandler();\r\n'
+'      }\r\n'
+'   }\r\n'
+'\r\n'
+'   return;\r\n'
+'}\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function doCommit()\r\n'
+'** Inputs:  None\r\n'
+'** Return:  None\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Call the Commit function \r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function doCommit()\r\n'
+'{\r\n'
+'   var api = getAPIHandle();\r\n'
+'   if (api == null)\r\n'
+'   {\r\n'
+'      alert("Unable to locate the LMS\'s API Implementation.\\nCommit was not successful.");\r\n'
+'      return "false";\r\n'
+'   }\r\n'
+'   else\r\n'
+'   {\r\n'
+'      var result = api.LMSCommit("");\r\n'
+'      if (result != "true")\r\n'
+'      {\r\n'
+'         var err = ErrorHandler();\r\n'
+'      }\r\n'
+'   }\r\n'
+'\r\n'
+'   return result.toString();\r\n'
+'}\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function doGetLastError()\r\n'
+'** Inputs:  None\r\n'
+'** Return:  The error code that was set by the last LMS function call\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Call the GetLastError function \r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function doGetLastError()\r\n'
+'{\r\n'
+'   var api = getAPIHandle();\r\n'
+'   if (api == null)\r\n'
+'   {\r\n'
+'      alert("Unable to locate the LMS\'s API Implementation.\\nGetLastError was not successful.");\r\n'
+'      //since we can\'t get the error code from the LMS, return a general error\r\n'
+'      return _GeneralError;\r\n'
+'   }\r\n'
+'\r\n'
+'   return api.LMSGetLastError().toString();\r\n'
+'}\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function doGetErrorString(errorCode)\r\n'
+'** Inputs:  errorCode - Error Code\r\n'
+'** Return:  The textual description that corresponds to the input error code\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Call the GetErrorString function \r\n'
+'**\r\n'
+'********************************************************************************/\r\n'
+'function doGetErrorString(errorCode)\r\n'
+'{\r\n'
+'   var api = getAPIHandle();\r\n'
+'   if (api == null)\r\n'
+'   {\r\n'
+'      alert("Unable to locate the LMS\'s API Implementation.\\nGetErrorString was not successful.");\r\n'
+'   }\r\n'
+'\r\n'
+'   return api.LMSGetErrorString(errorCode).toString();\r\n'
+'}\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function doGetDiagnostic(errorCode)\r\n'
+'** Inputs:  errorCode - Error Code(integer format), or null\r\n'
+'** Return:  The vendor specific textual description that corresponds to the \r\n'
+'**          input error code\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Call the LMSGetDiagnostic function\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function doGetDiagnostic(errorCode)\r\n'
+'{\r\n'
+'   var api = getAPIHandle();\r\n'
+'   if (api == null)\r\n'
+'   {\r\n'
+'      alert("Unable to locate the LMS\'s API Implementation.\\nGetDiagnostic was not successful.");\r\n'
+'   }\r\n'
+'\r\n'
+'   return api.LMSGetDiagnostic(errorCode).toString();\r\n'
+'}\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function ErrorHandler()\r\n'
+'** Inputs:  None\r\n'
+'** Return:  The current value of the LMS Error Code\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Determines if an error was encountered by the previous API call\r\n'
+'** and if so, displays a message to the user.  If the error code\r\n'
+'** has associated text it is also displayed.\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function ErrorHandler()\r\n'
+'{\r\n'
+'   var api = getAPIHandle();\r\n'
+'   if (api == null)\r\n'
+'   {\r\n'
+'      alert("Unable to locate the LMS\'s API Implementation.\\nCannot determine LMS error code.");\r\n'
+'      return;\r\n'
+'   }\r\n'
+'\r\n'
+'   // check for errors caused by or from the LMS\r\n'
+'   var errCode = api.LMSGetLastError().toString();\r\n'
+'   if (errCode != _NoError && errCode != _AlreadyInitialized )\r\n'
+'   {\r\n'
+'      // an error was encountered so display the error description\r\n'
+'      var errDescription = api.LMSGetErrorString(errCode);\r\n'
+'\r\n'
+'      if (_Debug == true)\r\n'
+'      {\r\n'
+'         errDescription += "\\n";\r\n'
+'         errDescription += api.LMSGetDiagnostic(null);\r\n'
+'         // by passing null to GetDiagnostic, we get any available diagnostics\r\n'
+'         // on the previous error.\r\n'
+'      }\r\n'
+'\r\n'
+'      alert(errDescription);\r\n'
+'   }\r\n'
+'\r\n'
+'   return errCode;\r\n'
+'}\r\n'
+'\r\n'
+'/******************************************************************************\r\n'
+'**\r\n'
+'** Function getAPIHandle()\r\n'
+'** Inputs:  None\r\n'
+'** Return:  value contained by APIHandle\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Returns the handle to API object if it was previously set,\r\n'
+'** otherwise it returns null\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function getAPIHandle()\r\n'
+'{\r\n'
+'   if (apiHandle == null)\r\n'
+'   {\r\n'
+'      apiHandle = getAPI();\r\n'
+'   }\r\n'
+'\r\n'
+'   return apiHandle;\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function findAPI(win)\r\n'
+'** Inputs:  win - a Window Object\r\n'
+'** Return:  If an API object is found, it\'s returned, otherwise null is returned\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** This function looks for an object named API in parent and opener windows\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function findAPI(win)\r\n'
+'{\r\n'
+'   while ((win.API == null) && (win.parent != null) && (win.parent != win))\r\n'
+'   {\r\n'
+'      findAPITries++;\r\n'
+'      \r\n'
+'      if (findAPITries > 500) \r\n'
+'      {\r\n'
+'         alert("Error finding API -- too deeply nested.");\r\n'
+'         return null;\r\n'
+'      }\r\n'
+'      \r\n'
+'      win = win.parent;\r\n'
+'\r\n'
+'   }\r\n'
+'   return win.API;\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function getAPI()\r\n'
+'** Inputs:  none\r\n'
+'** Return:  If an API object is found, it\'s returned, otherwise null is returned\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** This function looks for an object named API, first in the current window\'s \r\n'
+'** frame hierarchy and then, if necessary, in the current window\'s opener window\r\n'
+'** hierarchy (if there is an opener window).\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function getAPI()\r\n'
+'{\r\n'
+'   var theAPI = findAPI(window);\r\n'
+'   if ((theAPI == null) && (window.opener != null) && (typeof(window.opener) != "undefined"))\r\n'
+'   {\r\n'
+'      theAPI = findAPI(window.opener);\r\n'
+'   }\r\n'
+'   if (theAPI == null)\r\n'
+'   {\r\n'
+'      alert("Unable to find an API adapter");\r\n'
+'   }\r\n'
+'   return theAPI\r\n'
+'}\r\n'
+'\r\n'
+'/* This if for SCORM 1.2, adapted from SCORM 2004 2nd Ed., BUT not everything has been tested! */\r\n'
+'\r\n'
+'var traceSCORM_API = false;\r\n'
+'\r\n'
+'var APP_NAME = \'C3 SCORM Runtime\';\r\n'
+'\r\n'
+'var SCO_LMS_Version;\r\n'
+'var SCO_LMS_Status;\r\n'
+'var SCO_ExitPageStatus;\r\n'
+'\r\n'
+'var SCO_StartTimestamp;\r\n'
+'var SCO_EndTimestamp;\r\n'
+'\r\n'
+'var SCO_STATUS_UNKNOWN       = \'unknown\';\r\n'
+'var SCO_STATUS_NOT_ATTEMPTED = \'not attempted\';\r\n'
+'var SCO_STATUS_INCOMPLETE    = \'incomplete\';\r\n'
+'var SCO_STATUS_COMPLETED     = \'completed\';\r\n'
+'\r\n'
+'var SCO_LessonStatus         = SCO_STATUS_NOT_ATTEMPTED;\r\n'
+'\r\n'
+'var CMI_LOCATION          = \'cmi.core.lesson_location\';\r\n'
+'var CMI_SESSION_TIME      = \'cmi.core.session_time\';\r\n'
+'var CMI_VERSION           = \'cmi._version\';\r\n'
+'var CMI_COMPLETION_STATUS = \'cmi.core.lesson_status\';\r\n'
+'\r\n'
+'var CMI_SCORE             = \'cmi.core.score.raw\';  // -1 <= s <= 1\r\n'
+'var CMI_PASSING_SCORE     = \'cmi.scaled_passing\';  // -1 <= s <= 1\r\n'
+'\r\n'
+'var CMI_SUCCESS_STATUS         = CMI_COMPLETION_STATUS; //1.2 has no Success Status\r\n'
+'var CMI_SUCCESS_STATUS_PASSED  = \'passed\';\r\n'
+'var CMI_SUCCESS_STATUS_FAILED  = \'failed\';\r\n'
+'var CMI_SUCCESS_STATUS_UNKNOWN = \'incomplete\';\r\n'
+'\r\n'
+'var CMI_INTERACTIONS_ID               = \'cmi.interactions.n.id\';\r\n'
+'var CMI_INTERACTIONS_TYPE             = \'cmi.interactions.n.type\';\r\n'
+'var CMI_INTERACTIONS_TYPE_TF          = \'true-false\';\r\n'
+'var CMI_INTERACTIONS_TYPE_CHOICE      = \'choice\';\r\n'
+'var CMI_INTERACTIONS_TYPE_MATCHING    = \'matching\';\r\n'
+'var CMI_INTERACTIONS_CORRECT          = \'cmi.interactions.n.correct_responses.0.pattern\';\r\n'
+'var CMI_INTERACTIONS_RESPONSE         = \'cmi.interactions.n.student_response\';\r\n'
+'var CMI_INTERACTIONS_RESULT           = \'cmi.interactions.n.result\';\r\n'
+'var CMI_INTERACTIONS_RESULT_CORRECT   = \'correct\';\r\n'
+'var CMI_INTERACTIONS_RESULT_INCORRECT = \'wrong\';\r\n'
+'var CMI_INTERACTIONS_WEIGHTING        = \'cmi.interactions.n.weighting\'; \r\n'
+'\r\n'
+'var CMI_EXIT                          = \'cmi.core.exit\';\r\n'
+'var CMI_EXIT_NORMAL                   = \'normal\';\r\n'
+'var CMI_EXIT_SUSPEND                  = \'suspend\';\r\n'
+'var CMI_EXIT_TIMEOUT                  = \'time-out\';\r\n'
+'var CMI_EXIT_LOGOUT                   = \'logout\';\r\n'
+'var CMI_EXIT_UNDETERMINED             = \'\';\r\n'
+'var CMI_SUSPEND_DATA                  = \'cmi.suspend_data\'; \r\n'
+'\r\n'
+'var ADL_NAV_REQUEST             = \'adl.nav.request\';\r\n'
+'\r\n'
+'var SCO_NAV_REQUEST_CONTINUE    = \'continue\';\r\n'
+'var SCO_NAV_REQUEST_PREVIOUS    = \'previous\';\r\n'
+'var SCO_NAV_REQUEST_CHOICE      = \'choice\';\r\n'
+'var SCO_NAV_REQUEST_EXIT        = \'exit\';\r\n'
+'var SCO_NAV_REQUEST_EXIT_ALL    = \'exitAll\';\r\n'
+'var SCO_NAV_REQUEST_ABANDON     = \'abandon\';\r\n'
+'var SCO_NAV_REQUEST_ABANDON_ALL = \'abandonAll\';\r\n'
+'var SCO_NAV_REQUEST_NONE        = \'_none_\';\r\n'
+'\r\n'
+'var ADL_NAV_REQUEST_VALID_PREVIOUS = \'adl.nav.request_valid.previous\';\r\n'
+'var ADL_NAV_REQUEST_VALID_CONTINUE = \'adl.nav.request_valid.continue\';\r\n'
+'\r\n'
+'\r\n'
+'function QTypeToCMI_INTERACTION_TYPE( type )\r\n'
+'{\r\n'
+'   switch (type.toUpperCase())\r\n'
+'   {\r\n'
+'      case \'TRUE_FALSE\':             type = CMI_INTERACTIONS_TYPE_CHOICE;   break;\r\n'
+'      case \'MULTIPLE_CHOICE\':        type = CMI_INTERACTIONS_TYPE_CHOICE;   break;\r\n'
+'      case \'MULTI_MULTIPLE_CHOICE\':  type = CMI_INTERACTIONS_TYPE_CHOICE;   break;\r\n'
+'      case \'MATCHING\':               type = CMI_INTERACTIONS_TYPE_MATCHING; break;\r\n'
+'      case \'ORDERING\':               type = CMI_INTERACTIONS_TYPE_MATCHING; break;\r\n'
+'      case \'DRAG_AND_DROP\':          type = CMI_INTERACTIONS_TYPE_MATCHING; break;\r\n'
+'\r\n'
+'      default:                       type = CMI_INTERACTIONS_TYPE_CHOICE;   break;\r\n'
+'   }\r\n'
+'\r\n'
+'   return type;\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function ConvertToCMI_INTERACTION_TYPE( type, pattern )\r\n'
+'{\r\n'
+'   pattern = pattern.replace(/^\\s+|\\s+$/g, \'\');\r\n'
+'\r\n'
+'   switch ( type )\r\n'
+'   {\r\n'
+'      case CMI_INTERACTIONS_TYPE_CHOICE:\r\n'
+'         return pattern; break;\r\n'
+'\r\n'
+'      case CMI_INTERACTIONS_TYPE_MATCHING:\r\n'
+'\r\n'
+'         var p = pattern.split(\',\');\r\n'
+'\r\n'
+'         for (var i = 0; i < p.length; i++)\r\n'
+'            p[i] = (i + 1) + \'.\' + p[i];\r\n'
+'\r\n'
+'         return p.join(\',\');\r\n'
+'   }\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function ConvertFromCMI_INTERACTION_TYPE( type, pattern )\r\n'
+'{\r\n'
+'   switch ( type )\r\n'
+'   {\r\n'
+'      case CMI_INTERACTIONS_TYPE_CHOICE:\r\n'
+'         return pattern.split(\',\').join(\' \'); break;\r\n'
+'\r\n'
+'      case CMI_INTERACTIONS_TYPE_MATCHING:\r\n'
+'         var p = pattern.split(\',\');\r\n'
+'\r\n'
+'         for (var i = 0; i < p.length; i++)\r\n'
+'            p[i] = p[i].split(\'.\')[1];\r\n'
+'\r\n'
+'         return pattern.join(\' \');\r\n'
+'   }\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_GetInteractionResponse( n, id, type )\r\n'
+'{\r\n'
+'   InitializeNonexistantInteractions(n);\r\n'
+'   \r\n'
+'   type = QTypeToCMI_INTERACTION_TYPE( type );\r\n'
+'\r\n'
+'   doSetValue( CMI_INTERACTIONS_ID.replace(\'.n.\', \'.\' + n + \'.\'),   id );\r\n'
+'   doSetValue( CMI_INTERACTIONS_TYPE.replace(\'.n.\', \'.\' + n + \'.\'), type );\r\n'
+'\r\n'
+'   var value = doGetValue( ConvertFromCMI_INTERACTION_TYPE( type, CMI_INTERACTIONS_RESPONSE.replace(\'.n.\', \'.\' + n + \'.\') ) );\r\n'
+'\r\n'
+'   //alert(\'SCO_GetInteractionResponse: \' + value + \'\\n\\nvalue: \' + typeof(value));\r\n'
+'\r\n'
+'   return value;\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_SetInteraction( n, id, type, correctPattern, currentPattern, score , passingScore)\r\n'
+'{\r\n'
+'   /*\r\n'
+'   alert(\r\n'
+'      \'SCO_SetInteraction:\\n\\n\' +\r\n'
+'      \'interation number n = \' + n + \'\\n\\n\' +\r\n'
+'      \'id = \' + id + \'\\n\\n\' +\r\n'
+'      \'type = \' + type + \'\\n\\n\' +\r\n'
+'      \'correctPattern = \' + correctPattern + \'\\n\\n\' +\r\n'
+'      \'currentPattern = \' + currentPattern + \'\\n\\n\' +\r\n'
+'      \'score = \' + score + \'\\n\\n\' +\r\n'
+'      \'passingScore = \' + passingScore\r\n'
+'   );\r\n'
+'   */\r\n'
+'\r\n'
+'   InitializeNonexistantInteractions(n);\r\n'
+'\r\n'
+'   type = QTypeToCMI_INTERACTION_TYPE( type );\r\n'
+'\r\n'
+'   doSetValue( CMI_INTERACTIONS_ID.replace(\'.n.\', \'.\' + n + \'.\'),   id );\r\n'
+'\r\n'
+'   doSetValue( CMI_INTERACTIONS_TYPE.replace(\'.n.\', \'.\' + n + \'.\'), type );\r\n'
+'\r\n'
+'   doSetValue( CMI_INTERACTIONS_CORRECT.replace(\'.n.\', \'.\' + n + \'.\'),  ConvertToCMI_INTERACTION_TYPE( type, correctPattern ) );\r\n'
+'   doSetValue( CMI_INTERACTIONS_RESPONSE.replace(\'.n.\', \'.\' + n + \'.\'), ConvertToCMI_INTERACTION_TYPE( type, currentPattern ) );\r\n'
+'\r\n'
+'   var result = CMI_INTERACTIONS_RESULT_INCORRECT;\r\n'
+'\r\n'
+'   if ( correctPattern == currentPattern )\r\n'
+'      result = CMI_INTERACTIONS_RESULT_CORRECT;\r\n'
+'\r\n'
+'   doSetValue( CMI_INTERACTIONS_RESULT.replace(\'.n.\', \'.\' + n + \'.\'), result );\r\n'
+'\r\n'
+'   doSetValue( CMI_SCORE,         (score        / 100 ).toPrecision(3) );\r\n'
+'\r\n'
+'   /*\r\n'
+'   doSetValue( CMI_PASSING_SCORE, (passingScore / 100 ).toPrecision(3) );\r\n'
+'\r\n'
+'   if ( doGetValue( CMI_PASSING_SCORE ) == \'\' )\r\n'
+'   {\r\n'
+'      if ( score >= passingScore )\r\n'
+'         doSetValue( CMI_SUCCESS_STATUS, CMI_SUCCESS_STATUS_PASSED );\r\n'
+'      else\r\n'
+'         doSetValue( CMI_SUCCESS_STATUS, CMI_SUCCESS_STATUS_FAILED );\r\n'
+'\r\n'
+'   }\r\n'
+'   */\r\n'
+'\r\n'
+'   if ( passingScore != undefined && passingScore != \'\' )\r\n'
+'   {\r\n'
+'      if ( score >= passingScore )\r\n'
+'         doSetValue( CMI_SUCCESS_STATUS, CMI_SUCCESS_STATUS_PASSED );\r\n'
+'      else\r\n'
+'         doSetValue( CMI_SUCCESS_STATUS, CMI_SUCCESS_STATUS_FAILED );\r\n'
+'\r\n'
+'   }\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function InitializeNonexistantInteractions(n)\r\n'
+'{\r\n'
+'   try\r\n'
+'   {\r\n'
+'        var count = doGetValue( CMI_INTERACTIONS_ID.replace(\'.n.id\', \'._count\'));\r\n'
+'        var top   = n + 1;\r\n'
+'\r\n'
+'        for (var i = count; i < top; i++)\r\n'
+'        {\r\n'
+'            doSetValue( CMI_INTERACTIONS_ID.replace(\'.n.\', \'.\' + i + \'.\'),   \'INIT\' + i );\r\n'
+'        }\r\n'
+'   }\r\n'
+'   catch (e) {}\r\n'
+'}\r\n'
+' \r\n'
+'\r\n'
+'function SCO_LoadICU()\r\n'
+'{\r\n'
+'    if ( traceSCORM_API ) alert(\'SCOFunctions SCO_LoadICU()\');\r\n'
+'\r\n'
+'    try\r\n'
+'    {\r\n'
+'        SCO_StartTimestamp = new Date();\r\n'
+' \r\n'
+'        SCO_LMS_Status = doInitialize();\r\n'
+'\r\n'
+'        //Not used, and the Meridian/MCALMS does not implement the CMI_VERSION, so this caues an error.\r\n'
+'        //if (SCO_LMS_Status == "true")\r\n'
+'        //   SCO_LMS_Version = doGetValue( CMI_VERSION );\r\n'
+'\t\t\r\n'
+'\t\tSCO_SetStatusLatched(SCO_STATUS_INCOMPLETE, true );\t\t\r\n'
+'        doSetValue( CMI_EXIT, CMI_EXIT_SUSPEND );\r\n'
+'\t\t\r\n'
+'    }\r\n'
+'    catch(e)\r\n'
+'    {\r\n'
+'        alert( APP_NAME + \' SCO_LoadPage() Problem: \' + e.message );\r\n'
+'    }\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_ExitICU(manual) \r\n'
+'{\r\n'
+'    manual = (manual == undefined ? false : manual);\r\n'
+'\t/*\r\n'
+'    if (lessonUnloaded == true)\r\n'
+'       return;\r\n'
+'  \r\n'
+'\r\n'
+'    var unfinished = ShowGradeDialog(manual);\r\n'
+'\r\n'
+'    if ( unfinished != \'\' && manual == true)\r\n'
+'    {\r\n'
+'       loadFrame( unfinished);\r\n'
+'       return;\r\n'
+'    }\r\n'
+'\t*/ \r\n'
+'    if ( traceSCORM_API ) alert(\'SCOFunctions SCO_ExitICU()\');\r\n'
+'\r\n'
+'    SCO_EndTimestamp = new Date();\r\n'
+'\r\n'
+'    var n;\r\n'
+'  \r\n'
+'    if (SCO_LMS_Status =="true") \r\n'
+'    {\r\n'
+'        if (SCO_ExitPageStatus != true) \r\n'
+'        {\t\t\t\r\n'
+'            try\r\n'
+'            {\r\n'
+'                SCO_ExitPageStatus = true;\r\n'
+'\r\n'
+'                doSetValue( CMI_SESSION_TIME, \r\n'
+'                            SCO_CalcElapstedTime1_2( SCO_StartTimestamp, SCO_EndTimestamp ) );\r\n'
+'                doSetValue( CMI_EXIT, CMI_EXIT_SUSPEND );\r\n'
+'                doCommit();\r\n'
+'            }\r\n'
+'            catch(e)\r\n'
+'            {\r\n'
+'                alert( APP_NAME + \' SCO_ExitPage() Problem: \' + e.message );\r\n'
+'            }\r\n'
+'            finally\r\n'
+'            {\r\n'
+'                doTerminate();\r\n'
+'            }\r\n'
+'        }\r\n'
+'    }\t\r\n'
+'\r\n'
+'    try { RuntimeStopAllMultimedia( argExitFrame=true ) } catch (e) {}\r\n'
+'\r\n'
+'\r\n'
+'    // If we\'re not running in an LMS, then we\'ll close the courseware window!\r\n'
+'\r\n'
+'    //if (SCO_LMS_Status =="false")\t\r\n'
+'        window.close();\r\n'
+'\r\n'
+'\r\n'
+'    lessonUnloaded = true;\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'function SCO_LoadFrame( frameBookmarkId, bHiddenFrame )\r\n'
+'{\r\n'
+'    if ( traceSCORM_API ) alert(\'SCOFunctions SCO_LoadFrame("\' + frameBookmarkId + \'")\');\r\n'
+'\r\n'
+'    bHiddenFrame = (bHiddenFrame == undefined) ? false : bHiddenFrame;\r\n'
+'\r\n'
+'    try\r\n'
+'    {\r\n'
+'        doSetValue( CMI_LOCATION, frameBookmarkId );\r\n'
+'\r\n'
+'        if (bHiddenFrame == false)\r\n'
+'           doCommit();\r\n'
+'    }\r\n'
+'    catch (e) {}\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_ExitFrame()\r\n'
+'{\r\n'
+'    if ( traceSCORM_API ) alert(\'SCOFunctions SCO_ExitFrame()\');\r\n'
+'\r\n'
+'    try\r\n'
+'    {\r\n'
+'    }\r\n'
+'    catch (e) {}\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'function SCO_GetBookmarkLocation()\r\n'
+'{\r\n'
+'    if ( traceSCORM_API ) alert(\'SCOFunctions SCO_GetBookmarkLocation()\');\r\n'
+'\r\n'
+'    var location = \'\';\r\n'
+'\r\n'
+'    try\r\n'
+'    {\r\n'
+'        location = doGetValue( CMI_LOCATION );\r\n'
+'\r\n'
+'        if ( doGetLastError() == _DataModelElementValueNotInitialized )\r\n'
+'            location = \'\';\r\n'
+'    }\r\n'
+'    catch (e) {}\r\n'
+'\r\n'
+'    return location;\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_SetStatus_NotAttempted( latch )\r\n'
+'{\r\n'
+'    SCO_SetStatusLatched( SCO_STATUS_NOT_ATTEMPTED, latch );\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_SetStatus_Incomplete( latch )\r\n'
+'{\r\n'
+'    SCO_SetStatusLatched( SCO_STATUS_INCOMPLETE, latch );\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_SetStatus_Completed( latch )\r\n'
+'{\r\n'
+'    SCO_SetStatusLatched( SCO_STATUS_COMPLETED, latch );\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_PreviousSCOAvailable()\r\n'
+'{\r\n'
+'    var value = doGetValue( ADL_NAV_REQUEST_VALID_PREVIOUS).toLowerCase();\r\n'
+'\r\n'
+'    if ( traceSCORM_API ) alert(\'SCOFunctions SCO_PreviousSCOAvailable() \' + value);\r\n'
+'\r\n'
+'    return (value == \'true\');\r\n'
+'}\r\n'
+'\r\n'
+'function SCO_NextSCOAvailable()\r\n'
+'{\r\n'
+'    var value = doGetValue( ADL_NAV_REQUEST_VALID_CONTINUE).toLowerCase();\r\n'
+'\r\n'
+'    if ( traceSCORM_API ) alert(\'SCOFunctions SCO_NextSCOAvailable() \' + value);\r\n'
+'\r\n'
+'    return (value == \'true\');\r\n'
+'}\r\n'
+'\r\n'
+'function SCO_SetNavigation( navCommand )\r\n'
+'{\r\n'
+'    //Not used in SCORM 1.2\r\n'
+'    //navCommand = (navCommand == undefined) ? SCO_NAV_REQUEST_NONE : navCommand;\r\n'
+'\r\n'
+'    //doSetValue( ADL_NAV_REQUEST, navCommand );\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_LoadSuspendData()\r\n'
+'{\r\n'
+'   //return \'0_1|1_0\'; //for testing\r\n'
+'   return doGetValue( CMI_SUSPEND_DATA );\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_SaveSuspendData( data )\r\n'
+'{\r\n'
+'   //alert(\'SuspendData\\n\\n\' + data);\r\n'
+'   doSetValue( CMI_EXIT,         CMI_EXIT_SUSPEND );\r\n'
+'   doSetValue( CMI_SUSPEND_DATA, data );\r\n'
+'   doCommit();\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'////////////// Supporting Routines ///////////////\r\n'
+'\r\n'
+'\r\n'
+'// Returns elapsted time in SCORM "timeinterval" form:\r\n'
+'//\r\n'
+'//  P[yY][mM][dD][T[hH][mM][s[.s]S]]\r\n'
+'//\r\n'
+'//  where:\r\n'
+'//\r\n'
+'//  • y: The number of years   (integer, >= 0, not restricted)\r\n'
+'//  • m: The number of months  (integer, >= 0, not restricted)\r\n'
+'//  • d: The number of days    (integer, >= 0, not restricted)\r\n'
+'//  • h: The number of hours   (integer, >= 0, not restricted)\r\n'
+'//  • n: The number of minutes (integer, >= 0, not restricted)\r\n'
+'//  • s: The number of seconds or fraction of seconds \r\n'
+'//       (real or integer, >= 0, not restricted). If fractions \r\n'
+'//       of a second are used, SCORM further restricts the string \r\n'
+'//       to a maximum of 2 digits (e.g., 34.45 – valid, \r\n'
+'//       34.45454545 – not valid).\r\n'
+'//\r\n'
+'//  • The character literals designators “P”,”Y”,”M”,”D”,”T”,”H”,\r\n'
+'//    ”M”,”S” shall appear if the corresponding non-zero value is \r\n'
+'//    present.\r\n'
+'//\r\n'
+'//  Example:\r\n'
+'//\r\n'
+'//  • P1Y3M2DT3H indicates a period of time of 1 year, 3 months, \r\n'
+'//    2 days and 3 hours\r\n'
+'//  • PT3H5M indicates a period of time of 3 hours and 5 minutes\r\n'
+'\r\n'
+'\r\n'
+'function SCO_CalcElapstedTime( startTimestamp, endTimestamp )\r\n'
+'{\r\n'
+'   var diff = Math.floor( (( endTimestamp) - startTimestamp ) / 1000);\r\n'
+'\r\n'
+'    var years  = 0;\r\n'
+'    var months = 0;\r\n'
+'    var days   = 0;\r\n'
+'\r\n'
+'    var csecs  = Math.floor(((endTimestamp - startTimestamp) % 1000) / 10);\r\n'
+'    var secs   = Math.floor( diff % 60);\r\n'
+'    var mins   = Math.floor( diff / 60) % 60;\r\n'
+'    var hours  = Math.floor( diff / 3600);\r\n'
+'\r\n'
+'    return \'P\' + \r\n'
+'           years  + \'Y\' +\r\n'
+'           months + \'M\' +\r\n'
+'           days   + \'D\' +\r\n'
+'           \'T\' +\r\n'
+'           hours  + \'H\' +\r\n'
+'           mins   + \'M\' +\r\n'
+'           secs   + \'.\' + (\'00\'+csecs  ).replace(/.*?(\\d{2})$/,\'\\$1\') + \'S\';\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_CalcElapstedTime1_2( startTimestamp, endTimestamp )\r\n'
+'{\r\n'
+'   var diff = Math.floor( (( endTimestamp) - startTimestamp ) / 1000);\r\n'
+'\r\n'
+'    var years  = 0;\r\n'
+'    var months = 0;\r\n'
+'    var days   = 0;\r\n'
+'\r\n'
+'    var csecs  = Math.floor(((endTimestamp - startTimestamp) % 1000) / 10);\r\n'
+'    var secs   = Math.floor( diff % 60);\r\n'
+'    var mins   = Math.floor( diff / 60) % 60;\r\n'
+'    var hours  = Math.floor( diff / 3600);\r\n'
+'\r\n'
+'    return (\'0000\' + (hours+0)).replace(/.*?(\\d{4,4})$/, \'\\$1\') + \':\' +\r\n'
+'           (\'00\'   + (mins +0)).replace(/.*?(\\d{2,2})$/, \'\\$1\') + \':\' +\r\n'
+'           (\'00\'   + (secs +0)).replace(/.*?(\\d{2,2})$/, \'\\$1\') + \'.\' +\r\n'
+'           (\'00\'   + (csecs+0)).replace(/.*?(\\d{2,2})$/, \'\\$1\');\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'function SCO_SetStatusLatched( status, latch )\r\n'
+'{\r\n'
+'    if ( traceSCORM_API ) alert(\'SCOFunctions SCO_SetStatusLatched("\' + status + \'")\');\r\n'
+'\r\n'
+'    try\r\n'
+'    {\r\n'
+'        latch = (latch != undefined) ? latch : false;\r\n'
+'\r\n'
+'        if ( latch )\r\n'
+'        {\r\n'
+'            var currentStatus = doGetValue( CMI_COMPLETION_STATUS );\r\n'
+'\r\n'
+'            if ( currentStatus == SCO_STATUS_UNKNOWN )\r\n'
+'                currentStatus = SCO_STATUS_NOT_ATTEMPTED;\r\n'
+'\r\n'
+'\r\n'
+'            if ( currentStatus == SCO_STATUS_NOT_ATTEMPTED )\r\n'
+'            {\r\n'
+'                if ( status == SCO_STATUS_INCOMPLETE ||\r\n'
+'                     status == SCO_STATUS_COMPLETED)\r\n'
+'                {\r\n'
+'                    doSetValue( CMI_COMPLETION_STATUS, status );\r\n'
+'                    doCommit();\r\n'
+'                }\r\n'
+'            }\r\n'
+'            else\r\n'
+'            if ( currentStatus == SCO_STATUS_INCOMPLETE )\r\n'
+'            {\r\n'
+'                if ( status == SCO_STATUS_COMPLETED )\r\n'
+'                {\r\n'
+'                    doSetValue( CMI_COMPLETION_STATUS, status );\r\n'
+'                    doCommit();\r\n'
+'                }\r\n'
+'            }\r\n'
+'            else\r\n'
+'            if ( currentStatus == SCO_STATUS_COMPLETED )\r\n'
+'            {\r\n'
+'                // Do nothing...\r\n'
+'            }\r\n'
+'        }\r\n'
+'        else\r\n'
+'        {\r\n'
+'            doSetValue( CMI_COMPLETION_STATUS, status );\r\n'
+'            doCommit();\r\n'
+'        }\r\n'
+'    }\r\n'
+'    catch (e) {}\r\n'
+'}\r\n'
+''
  , function (e) { if(e){return err(e)} chain[step++]() });

});




chain.push(function createJS2 () {
  fs.writeFile( path.resolve(tmp, 'Interfaces', 'empty_C3_interface', 'interface.js'),
  '' // empty file
  , function (e) { if(e){return err(e)} chain[step++]() });

});




chain.push(function createJS3 () {
  fs.writeFile( path.resolve(tmp, 'Interfaces', 'empty_C3_interface', 'Utils', 'APIWrapper.js'),
 '/* This if for SCORM 1.2, adapted from SCORM 2004 2nd Ed., BUT not everything has been tested! */\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** FileName: APIWrapper.js\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Concurrent Technologies Corporation (CTC) grants you ("Licensee") a non-\r\n'
+'** exclusive, royalty free, license to use, modify and redistribute this\r\n'
+'** software in source and binary code form, provided that i) this copyright\r\n'
+'** notice and license appear on all copies of the software; and ii) Licensee does\r\n'
+'** not utilize the software in a manner which is disparaging to CTC.\r\n'
+'**\r\n'
+'** This software is provided "AS IS," without a warranty of any kind.  ALL\r\n'
+'** EXPRESS OR IMPLIED CONDITIONS, REPRESENTATIONS AND WARRANTIES, INCLUDING ANY\r\n'
+'** IMPLIED WARRANTY OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE OR NON-\r\n'
+'** INFRINGEMENT, ARE HEREBY EXCLUDED.  CTC AND ITS LICENSORS SHALL NOT BE LIABLE\r\n'
+'** FOR ANY DAMAGES SUFFERED BY LICENSEE AS A RESULT OF USING, MODIFYING OR\r\n'
+'** DISTRIBUTING THE SOFTWARE OR ITS DERIVATIVES.  IN NO EVENT WILL CTC  OR ITS\r\n'
+'** LICENSORS BE LIABLE FOR ANY LOST REVENUE, PROFIT OR DATA, OR FOR DIRECT,\r\n'
+'** INDIRECT, SPECIAL, CONSEQUENTIAL, INCIDENTAL OR PUNITIVE DAMAGES, HOWEVER\r\n'
+'** CAUSED AND REGARDLESS OF THE THEORY OF LIABILITY, ARISING OUT OF THE USE OF\r\n'
+'** OR INABILITY TO USE SOFTWARE, EVEN IF CTC  HAS BEEN ADVISED OF THE POSSIBILITY\r\n'
+'** OF SUCH DAMAGES.\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'** This file is part of the ADL Sample API Implementation intended to provide\r\n'
+'** an elementary example of the concepts presented in the ADL Sharable\r\n'
+'** Content Object Reference Model (SCORM).\r\n'
+'**\r\n'
+'** The purpose in wrapping the calls to the API is to (1) provide a\r\n'
+'** consistent means of finding the LMS API implementation within the window\r\n'
+'** hierarchy and (2) to validate that the data being exchanged via the\r\n'
+'** API conforms to the defined CMI data types.\r\n'
+'**\r\n'
+'** This is just one possible example for implementing the API guidelines for\r\n'
+'** runtime communication between an LMS and executable content components.\r\n'
+'** There are several other possible implementations.\r\n'
+'**\r\n'
+'** Usage: Executable course content can call the API Wrapper\r\n'
+'**      functions as follows:\r\n'
+'**\r\n'
+'**    javascript:\r\n'
+'**          var result = doInitialize();\r\n'
+'**          if (result != true) \r\n'
+'**          {\r\n'
+'**             // handle error\r\n'
+'**          }\r\n'
+'**\r\n'
+'**    authorware:\r\n'
+'**          result := ReadURL("javascript:doInitialize()", 100)\r\n'
+'**\r\n'
+'**    director:\r\n'
+'**          result = externalEvent("javascript:doInitialize()")\r\n'
+'**\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'\r\n'
+'var _Debug = false;  // set this to false to turn debugging off\r\n'
+'                     // and get rid of those annoying alert boxes.\r\n'
+'\r\n'
+'// Define exception/error codes\r\n'
+'var _NoError = 0;\r\n'
+'var _GeneralException = 101;\r\n'
+'var _GeneralInitializationFailure = 102;\r\n'
+'var _AlreadyInitialized = 103;\r\n'
+'var _ContentInstanceTerminated = 104;\r\n'
+'var _GeneralTerminationFailure = 111;\r\n'
+'var _TerminationBeforeInitialization = 112;\r\n'
+'var _TerminationAfterTermination = 113;\r\n'
+'var _ReceivedDataBeforeInitialization = 122;\r\n'
+'var _ReceivedDataAfterTermination = 123;\r\n'
+'var _StoreDataBeforeInitialization = 132;\r\n'
+'var _StoreDataAfterTermination = 133;\r\n'
+'var _CommitBeforeInitialization = 142;\r\n'
+'var _CommitAfterTermination = 143;\r\n'
+'var _GeneralArgumentError = 201;\r\n'
+'var _GeneralGetFailure = 301;\r\n'
+'var _GeneralSetFailure = 351;\r\n'
+'var _GeneralCommitFailure = 391;\r\n'
+'var _UndefinedDataModelElement = 401;\r\n'
+'var _UnimplementedDataModelElement = 402;\r\n'
+'var _DataModelElementValueNotInitialized = 403;\r\n'
+'var _DataModelElementIsReadOnly = 404;\r\n'
+'var _DataModelElementIsWriteOnly = 405;\r\n'
+'var _DataModelElementTypeMismatch = 406;\r\n'
+'var _DataModelElementValueOutOfRange = 407;\r\n'
+'\r\n'
+'\r\n'
+'// local variable definitions\r\n'
+'var apiHandle = null;\r\n'
+'var API = null;\r\n'
+'var findAPITries = 0;\r\n'
+'\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function: doInitialize()\r\n'
+'** Inputs:  None\r\n'
+'** Return:  CMIBoolean true if the initialization was successful, or\r\n'
+'**          CMIBoolean false if the initialization failed.\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Initialize communication with LMS by calling the Initialize\r\n'
+'** function which will be implemented by the LMS.\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function doInitialize()\r\n'
+'{\r\n'
+'   var api = getAPIHandle();\r\n'
+'   if (api == null)\r\n'
+'   {\r\n'
+'      alert("Unable to locate the LMS\'s API Implementation.\\nInitialize was not successful.");\r\n'
+'      return "false";\r\n'
+'   }\r\n'
+'\r\n'
+'   var result = api.LMSInitialize("");\r\n'
+'\r\n'
+'   if (result.toString() != "true")\r\n'
+'   {\r\n'
+'      var err = ErrorHandler();\r\n'
+'   }\r\n'
+'\r\n'
+'   return result.toString();\r\n'
+'}\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function doTerminate()\r\n'
+'** Inputs:  None\r\n'
+'** Return:  CMIBoolean true if successful\r\n'
+'**          CMIBoolean false if failed.\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Close communication with LMS by calling the Terminate\r\n'
+'** function which will be implemented by the LMS\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function doTerminate()\r\n'
+'{  \r\n'
+'   var api = getAPIHandle();\r\n'
+'   if (api == null)\r\n'
+'   {\r\n'
+'      alert("Unable to locate the LMS\'s API Implementation.\\nTerminate was not successful.");\r\n'
+'      return "false";\r\n'
+'   }\r\n'
+'   else\r\n'
+'   {\r\n'
+'      // call the Terminate function that should be implemented by the API\r\n'
+'\r\n'
+'      var result = api.LMSFinish("");\r\n'
+'      if (result.toString() != "true")\r\n'
+'      {\r\n'
+'         var err = ErrorHandler();\r\n'
+'      }\r\n'
+'\r\n'
+'   }\r\n'
+'\r\n'
+'   return result.toString();\r\n'
+'}\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function doGetValue(name)\r\n'
+'** Inputs:  name - string representing the cmi data model defined category or\r\n'
+'**             element (e.g. cmi.core.student_id)\r\n'
+'** Return:  The value presently assigned by the LMS to the cmi data model\r\n'
+'**       element defined by the element or category identified by the name\r\n'
+'**       input value.\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Wraps the call to the GetValue method\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function doGetValue(name)\r\n'
+'{\r\n'
+'   var api = getAPIHandle();\r\n'
+'   if (api == null)\r\n'
+'   {\r\n'
+'      alert("Unable to locate the LMS\'s API Implementation.\\nGetValue was not successful.");\r\n'
+'      return "";\r\n'
+'   }\r\n'
+'   else\r\n'
+'   {\r\n'
+'      var value = api.LMSGetValue(name);\r\n'
+'      var errCode = api.LMSGetLastError().toString();\r\n'
+'      if (errCode != _NoError)\r\n'
+'      {\r\n'
+'         // an error was encountered so display the error description\r\n'
+'         var errDescription = api.LMSGetErrorString(errCode);\r\n'
+'         alert("GetValue("+name+") failed. \\n"+ errDescription);\r\n'
+'         return "";\r\n'
+'      }\r\n'
+'      else\r\n'
+'      {\r\n'
+'         \r\n'
+'         return value.toString();\r\n'
+'      }\r\n'
+'   }\r\n'
+'}\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function doSetValue(name, value)\r\n'
+'** Inputs:  name -string representing the data model defined category or element\r\n'
+'**          value -the value that the named element or category will be assigned\r\n'
+'** Return:  CMIBoolean true if successful\r\n'
+'**          CMIBoolean false if failed.\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Wraps the call to the SetValue function\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function doSetValue(name, value)\r\n'
+'{  \r\n'
+'   var api = getAPIHandle();\r\n'
+'   if (api == null)\r\n'
+'   {\r\n'
+'      alert("Unable to locate the LMS\'s API Implementation.\\nSetValue was not successful.");\r\n'
+'      return;\r\n'
+'   }\r\n'
+'   else\r\n'
+'   {\r\n'
+'      var result = api.LMSSetValue(name, value);\r\n'
+'      if (result.toString() != "true")\r\n'
+'      {\r\n'
+'         var err = ErrorHandler();\r\n'
+'      }\r\n'
+'   }\r\n'
+'\r\n'
+'   return;\r\n'
+'}\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function doCommit()\r\n'
+'** Inputs:  None\r\n'
+'** Return:  None\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Call the Commit function \r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function doCommit()\r\n'
+'{\r\n'
+'   var api = getAPIHandle();\r\n'
+'   if (api == null)\r\n'
+'   {\r\n'
+'      alert("Unable to locate the LMS\'s API Implementation.\\nCommit was not successful.");\r\n'
+'      return "false";\r\n'
+'   }\r\n'
+'   else\r\n'
+'   {\r\n'
+'      var result = api.LMSCommit("");\r\n'
+'      if (result != "true")\r\n'
+'      {\r\n'
+'         var err = ErrorHandler();\r\n'
+'      }\r\n'
+'   }\r\n'
+'\r\n'
+'   return result.toString();\r\n'
+'}\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function doGetLastError()\r\n'
+'** Inputs:  None\r\n'
+'** Return:  The error code that was set by the last LMS function call\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Call the GetLastError function \r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function doGetLastError()\r\n'
+'{\r\n'
+'   var api = getAPIHandle();\r\n'
+'   if (api == null)\r\n'
+'   {\r\n'
+'      alert("Unable to locate the LMS\'s API Implementation.\\nGetLastError was not successful.");\r\n'
+'      //since we can\'t get the error code from the LMS, return a general error\r\n'
+'      return _GeneralError;\r\n'
+'   }\r\n'
+'\r\n'
+'   return api.LMSGetLastError().toString();\r\n'
+'}\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function doGetErrorString(errorCode)\r\n'
+'** Inputs:  errorCode - Error Code\r\n'
+'** Return:  The textual description that corresponds to the input error code\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Call the GetErrorString function \r\n'
+'**\r\n'
+'********************************************************************************/\r\n'
+'function doGetErrorString(errorCode)\r\n'
+'{\r\n'
+'   var api = getAPIHandle();\r\n'
+'   if (api == null)\r\n'
+'   {\r\n'
+'      alert("Unable to locate the LMS\'s API Implementation.\\nGetErrorString was not successful.");\r\n'
+'   }\r\n'
+'\r\n'
+'   return api.LMSGetErrorString(errorCode).toString();\r\n'
+'}\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function doGetDiagnostic(errorCode)\r\n'
+'** Inputs:  errorCode - Error Code(integer format), or null\r\n'
+'** Return:  The vendor specific textual description that corresponds to the \r\n'
+'**          input error code\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Call the LMSGetDiagnostic function\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function doGetDiagnostic(errorCode)\r\n'
+'{\r\n'
+'   var api = getAPIHandle();\r\n'
+'   if (api == null)\r\n'
+'   {\r\n'
+'      alert("Unable to locate the LMS\'s API Implementation.\\nGetDiagnostic was not successful.");\r\n'
+'   }\r\n'
+'\r\n'
+'   return api.LMSGetDiagnostic(errorCode).toString();\r\n'
+'}\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function ErrorHandler()\r\n'
+'** Inputs:  None\r\n'
+'** Return:  The current value of the LMS Error Code\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Determines if an error was encountered by the previous API call\r\n'
+'** and if so, displays a message to the user.  If the error code\r\n'
+'** has associated text it is also displayed.\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function ErrorHandler()\r\n'
+'{\r\n'
+'   var api = getAPIHandle();\r\n'
+'   if (api == null)\r\n'
+'   {\r\n'
+'      alert("Unable to locate the LMS\'s API Implementation.\\nCannot determine LMS error code.");\r\n'
+'      return;\r\n'
+'   }\r\n'
+'\r\n'
+'   // check for errors caused by or from the LMS\r\n'
+'   var errCode = api.LMSGetLastError().toString();\r\n'
+'   if (errCode != _NoError && errCode != _AlreadyInitialized )\r\n'
+'   {\r\n'
+'      // an error was encountered so display the error description\r\n'
+'      var errDescription = api.LMSGetErrorString(errCode);\r\n'
+'\r\n'
+'      if (_Debug == true)\r\n'
+'      {\r\n'
+'         errDescription += "\\n";\r\n'
+'         errDescription += api.LMSGetDiagnostic(null);\r\n'
+'         // by passing null to GetDiagnostic, we get any available diagnostics\r\n'
+'         // on the previous error.\r\n'
+'      }\r\n'
+'\r\n'
+'      alert(errDescription);\r\n'
+'   }\r\n'
+'\r\n'
+'   return errCode;\r\n'
+'}\r\n'
+'\r\n'
+'/******************************************************************************\r\n'
+'**\r\n'
+'** Function getAPIHandle()\r\n'
+'** Inputs:  None\r\n'
+'** Return:  value contained by APIHandle\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** Returns the handle to API object if it was previously set,\r\n'
+'** otherwise it returns null\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function getAPIHandle()\r\n'
+'{\r\n'
+'   if (apiHandle == null)\r\n'
+'   {\r\n'
+'      apiHandle = getAPI();\r\n'
+'   }\r\n'
+'\r\n'
+'   return apiHandle;\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function findAPI(win)\r\n'
+'** Inputs:  win - a Window Object\r\n'
+'** Return:  If an API object is found, it\'s returned, otherwise null is returned\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** This function looks for an object named API in parent and opener windows\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function findAPI(win)\r\n'
+'{\r\n'
+'   while ((win.API == null) && (win.parent != null) && (win.parent != win))\r\n'
+'   {\r\n'
+'      findAPITries++;\r\n'
+'      \r\n'
+'      if (findAPITries > 500) \r\n'
+'      {\r\n'
+'         alert("Error finding API -- too deeply nested.");\r\n'
+'         return null;\r\n'
+'      }\r\n'
+'      \r\n'
+'      win = win.parent;\r\n'
+'\r\n'
+'   }\r\n'
+'   return win.API;\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'/*******************************************************************************\r\n'
+'**\r\n'
+'** Function getAPI()\r\n'
+'** Inputs:  none\r\n'
+'** Return:  If an API object is found, it\'s returned, otherwise null is returned\r\n'
+'**\r\n'
+'** Description:\r\n'
+'** This function looks for an object named API, first in the current window\'s \r\n'
+'** frame hierarchy and then, if necessary, in the current window\'s opener window\r\n'
+'** hierarchy (if there is an opener window).\r\n'
+'**\r\n'
+'*******************************************************************************/\r\n'
+'function getAPI()\r\n'
+'{\r\n'
+'   var theAPI = findAPI(window);\r\n'
+'   if ((theAPI == null) && (window.opener != null) && (typeof(window.opener) != "undefined"))\r\n'
+'   {\r\n'
+'      theAPI = findAPI(window.opener);\r\n'
+'   }\r\n'
+'   if (theAPI == null)\r\n'
+'   {\r\n'
+'      alert("Unable to find an API adapter");\r\n'
+'   }\r\n'
+'   return theAPI\r\n'
+'}\r\n'
+''
  , function (e) { if(e){return err(e)} chain[step++]() });

});




chain.push(function createJS4 () {
  fs.writeFile( path.resolve(tmp, 'Interfaces', 'empty_C3_interface', 'Utils', 'SCOFunctions.js'),
 '/* This if for SCORM 1.2, adapted from SCORM 2004 2nd Ed., BUT not everything has been tested! */\r\n'
+'\r\n'
+'var traceSCORM_API = false;\r\n'
+'\r\n'
+'var APP_NAME = \'C3 SCORM Runtime\';\r\n'
+'\r\n'
+'var SCO_LMS_Version;\r\n'
+'var SCO_LMS_Status;\r\n'
+'var SCO_ExitPageStatus;\r\n'
+'\r\n'
+'var SCO_StartTimestamp;\r\n'
+'var SCO_EndTimestamp;\r\n'
+'\r\n'
+'var SCO_STATUS_UNKNOWN       = \'unknown\';\r\n'
+'var SCO_STATUS_NOT_ATTEMPTED = \'not attempted\';\r\n'
+'var SCO_STATUS_INCOMPLETE    = \'incomplete\';\r\n'
+'var SCO_STATUS_COMPLETED     = \'completed\';\r\n'
+'\r\n'
+'var SCO_LessonStatus         = SCO_STATUS_NOT_ATTEMPTED;\r\n'
+'\r\n'
+'var CMI_LOCATION          = \'cmi.core.lesson_location\';\r\n'
+'var CMI_SESSION_TIME      = \'cmi.core.session_time\';\r\n'
+'var CMI_VERSION           = \'cmi._version\';\r\n'
+'var CMI_COMPLETION_STATUS = \'cmi.core.lesson_status\';\r\n'
+'\r\n'
+'var CMI_SCORE             = \'cmi.core.score.raw\';  // -1 <= s <= 1\r\n'
+'var CMI_PASSING_SCORE     = \'cmi.scaled_passing\';  // -1 <= s <= 1\r\n'
+'\r\n'
+'var CMI_SUCCESS_STATUS         = CMI_COMPLETION_STATUS; //1.2 has no Success Status\r\n'
+'var CMI_SUCCESS_STATUS_PASSED  = \'passed\';\r\n'
+'var CMI_SUCCESS_STATUS_FAILED  = \'failed\';\r\n'
+'var CMI_SUCCESS_STATUS_UNKNOWN = \'incomplete\';\r\n'
+'\r\n'
+'var CMI_INTERACTIONS_ID               = \'cmi.interactions.n.id\';\r\n'
+'var CMI_INTERACTIONS_TYPE             = \'cmi.interactions.n.type\';\r\n'
+'var CMI_INTERACTIONS_TYPE_TF          = \'true-false\';\r\n'
+'var CMI_INTERACTIONS_TYPE_CHOICE      = \'choice\';\r\n'
+'var CMI_INTERACTIONS_TYPE_MATCHING    = \'matching\';\r\n'
+'var CMI_INTERACTIONS_CORRECT_RESPONSES_COUNT = "cmi.interactions.n.correct_responses._count";\r\n'
+'var CMI_INTERACTIONS_CORRECT          = \'cmi.interactions.n.correct_responses.0.pattern\';\r\n'
+'var CMI_INTERACTIONS_RESPONSE         = \'cmi.interactions.n.student_response\';\r\n'
+'var CMI_INTERACTIONS_RESULT           = \'cmi.interactions.n.result\';\r\n'
+'var CMI_INTERACTIONS_RESULT_CORRECT   = \'correct\';\r\n'
+'var CMI_INTERACTIONS_RESULT_INCORRECT = \'wrong\';\r\n'
+'var CMI_INTERACTIONS_WEIGHTING        = \'cmi.interactions.n.weighting\'; \r\n'
+'\r\n'
+'var CMI_EXIT                          = \'cmi.exit\';\r\n'
+'var CMI_EXIT_NORMAL                   = \'normal\';\r\n'
+'var CMI_EXIT_SUSPEND                  = \'suspend\';\r\n'
+'var CMI_EXIT_TIMEOUT                  = \'time-out\';\r\n'
+'var CMI_EXIT_LOGOUT                   = \'logout\';\r\n'
+'var CMI_EXIT_UNDETERMINED             = \'\';\r\n'
+'var CMI_SUSPEND_DATA                  = \'cmi.suspend_data\'; \r\n'
+'\r\n'
+'var ADL_NAV_REQUEST             = \'adl.nav.request\';\r\n'
+'\r\n'
+'var SCO_NAV_REQUEST_CONTINUE    = \'continue\';\r\n'
+'var SCO_NAV_REQUEST_PREVIOUS    = \'previous\';\r\n'
+'var SCO_NAV_REQUEST_CHOICE      = \'choice\';\r\n'
+'var SCO_NAV_REQUEST_EXIT        = \'exit\';\r\n'
+'var SCO_NAV_REQUEST_EXIT_ALL    = \'exitAll\';\r\n'
+'var SCO_NAV_REQUEST_ABANDON     = \'abandon\';\r\n'
+'var SCO_NAV_REQUEST_ABANDON_ALL = \'abandonAll\';\r\n'
+'var SCO_NAV_REQUEST_NONE        = \'_none_\';\r\n'
+'\r\n'
+'var ADL_NAV_REQUEST_VALID_PREVIOUS = \'adl.nav.request_valid.previous\';\r\n'
+'var ADL_NAV_REQUEST_VALID_CONTINUE = \'adl.nav.request_valid.continue\';\r\n'
+'\r\n'
+'\r\n'
+'function QTypeToCMI_INTERACTION_TYPE( type )\r\n'
+'{\r\n'
+'   switch (type.toUpperCase())\r\n'
+'   {\r\n'
+'      case \'TRUE_FALSE\':             type = CMI_INTERACTIONS_TYPE_CHOICE;   break;\r\n'
+'      case \'MULTIPLE_CHOICE\':        type = CMI_INTERACTIONS_TYPE_CHOICE;   break;\r\n'
+'      case \'MULTI_MULTIPLE_CHOICE\':  type = CMI_INTERACTIONS_TYPE_CHOICE;   break;\r\n'
+'      case \'MATCHING\':               type = CMI_INTERACTIONS_TYPE_MATCHING; break;\r\n'
+'      case \'ORDERING\':               type = CMI_INTERACTIONS_TYPE_MATCHING; break;\r\n'
+'      case \'DRAG_AND_DROP\':          type = CMI_INTERACTIONS_TYPE_MATCHING; break;\r\n'
+'\r\n'
+'      default:                       type = CMI_INTERACTIONS_TYPE_CHOICE;   break;\r\n'
+'   }\r\n'
+'\r\n'
+'   return type;\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'function ConvertToCMI_INTERACTION_TYPE(type, pattern) \r\n'
+'{\r\n'
+'    var out = \'\';\r\n'
+'\r\n'
+'    pattern = pattern.replace(/^\\s+|\\s+$/g, \'\');\r\n'
+'\r\n'
+'    var p = pattern.split(\',\');\r\n'
+'\r\n'
+'\r\n'
+'    switch (type) {\r\n'
+'        case CMI_INTERACTIONS_TYPE_CHOICE:\r\n'
+'            for (var i = 0; i < p.length; i++)\r\n'
+'                p[i] = (i + 1) + \'_\' + p[i];\r\n'
+'\r\n'
+'            break;\r\n'
+'\r\n'
+'        case CMI_INTERACTIONS_TYPE_MATCHING:\r\n'
+'            for (var i = 0; i < p.length; i++)\r\n'
+'                p[i] = (i + 1) + \'[.]\' + p[i];\r\n'
+'\r\n'
+'            break;\r\n'
+'    }\r\n'
+'\r\n'
+'    //alert(\'ConvertToCMI{\' + p.join(\'[,]\') + \'}\');\r\n'
+'\r\n'
+'    out = p.join(\'[,]\');\r\n'
+'\r\n'
+'    return out;\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'function ConvertFromCMI_INTERACTION_TYPE(type, pattern) \r\n'
+'{\r\n'
+'    var out;\r\n'
+'\r\n'
+'    var p = pattern.split(\'[,]\');\r\n'
+'\r\n'
+'    switch (type) {\r\n'
+'        case CMI_INTERACTIONS_TYPE_CHOICE:\r\n'
+'            for (var i = 0; i < p.length; i++)\r\n'
+'                p[i] = p[i].split(\'_\')[1];\r\n'
+'\r\n'
+'            break;\r\n'
+'\r\n'
+'        case CMI_INTERACTIONS_TYPE_MATCHING:\r\n'
+'            for (var i = 0; i < p.length; i++)\r\n'
+'                p[i] = p[i].split(\'[.]\')[1];\r\n'
+'\r\n'
+'            break;\r\n'
+'    }\r\n'
+'\r\n'
+'    //alert(\'ConvertFromCMI{\' + pattern.join(\' \') + \'}\');\r\n'
+'\r\n'
+'    out = pattern.join(\' \');\r\n'
+'\r\n'
+'    return out;\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_GetInteractionResponse( n, id, type )\r\n'
+'{\r\n'
+'   return \'\'; //In 1.2 the cmi.interactions.n.student_response is write-only.\r\n'
+'   \r\n'
+'   InitializeNonexistantInteractions(n);\r\n'
+'   \r\n'
+'   type = QTypeToCMI_INTERACTION_TYPE( type );\r\n'
+'\r\n'
+'   doSetValue( CMI_INTERACTIONS_ID.replace(\'.n.\', \'.\' + n + \'.\'),   id );\r\n'
+'   doSetValue( CMI_INTERACTIONS_TYPE.replace(\'.n.\', \'.\' + n + \'.\'), type );\r\n'
+'\r\n'
+'   var value = doGetValue( ConvertFromCMI_INTERACTION_TYPE( type, CMI_INTERACTIONS_RESPONSE.replace(\'.n.\', \'.\' + n + \'.\') ) );\r\n'
+'\r\n'
+'   //alert(\'SCO_GetInteractionResponse: \' + value + \'\\n\\nvalue: \' + typeof(value));\r\n'
+'\r\n'
+'   return value;\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_SetInteraction( n, id, type, correctPattern, currentPattern, score , passingScore)\r\n'
+'{\r\n'
+'   /*\r\n'
+'   alert(\r\n'
+'      \'SCO_SetInteraction:\\n\\n\' +\r\n'
+'      \'interation number n = \' + n + \'\\n\\n\' +\r\n'
+'      \'id = \' + id + \'\\n\\n\' +\r\n'
+'      \'type = \' + type + \'\\n\\n\' +\r\n'
+'      \'correctPattern = \' + correctPattern + \'\\n\\n\' +\r\n'
+'      \'currentPattern = \' + currentPattern + \'\\n\\n\' +\r\n'
+'      \'score = \' + score + \'\\n\\n\' +\r\n'
+'      \'passingScore = \' + passingScore\r\n'
+'   );\r\n'
+'   */\r\n'
+'\r\n'
+'   InitializeNonexistantInteractions(n);\r\n'
+'\r\n'
+'   type = QTypeToCMI_INTERACTION_TYPE( type );\r\n'
+'\r\n'
+'   doSetValue( CMI_INTERACTIONS_ID.replace(\'.n.\', \'.\' + n + \'.\'),   id );\r\n'
+'\r\n'
+'   doSetValue( CMI_INTERACTIONS_TYPE.replace(\'.n.\', \'.\' + n + \'.\'), type );\r\n'
+'\r\n'
+'   if (Number(doGetValue(CMI_INTERACTIONS_CORRECT_RESPONSES_COUNT.replace(\'.n.\', \'.\' + n + \'.\'))) == 0)\r\n'
+'       doSetValue(CMI_INTERACTIONS_CORRECT.replace(\'.n.\', \'.\' + n + \'.\'), ConvertToCMI_INTERACTION_TYPE(type, correctPattern));\r\n'
+'\r\n'
+'   doSetValue( CMI_INTERACTIONS_RESPONSE.replace(\'.n.\', \'.\' + n + \'.\'), ConvertToCMI_INTERACTION_TYPE( type, currentPattern ) );\r\n'
+'\r\n'
+'   var result = CMI_INTERACTIONS_RESULT_INCORRECT;\r\n'
+'\r\n'
+'   if ( correctPattern == currentPattern )\r\n'
+'      result = CMI_INTERACTIONS_RESULT_CORRECT;\r\n'
+'\r\n'
+'   doSetValue( CMI_INTERACTIONS_RESULT.replace(\'.n.\', \'.\' + n + \'.\'), result );\r\n'
+'\r\n'
+'   doSetValue( CMI_SCORE,         (score        / 100 ).toPrecision(3) );\r\n'
+'\r\n'
+'   /*\r\n'
+'   doSetValue( CMI_PASSING_SCORE, (passingScore / 100 ).toPrecision(3) );\r\n'
+'\r\n'
+'   if ( doGetValue( CMI_PASSING_SCORE ) == \'\' )\r\n'
+'   {\r\n'
+'      if ( score >= passingScore )\r\n'
+'         doSetValue( CMI_SUCCESS_STATUS, CMI_SUCCESS_STATUS_PASSED );\r\n'
+'      else\r\n'
+'         doSetValue( CMI_SUCCESS_STATUS, CMI_SUCCESS_STATUS_FAILED );\r\n'
+'\r\n'
+'   }\r\n'
+'   */\r\n'
+'\r\n'
+'   if ( passingScore != undefined && passingScore != \'\' )\r\n'
+'   {\r\n'
+'      if ( score >= passingScore )\r\n'
+'         doSetValue( CMI_SUCCESS_STATUS, CMI_SUCCESS_STATUS_PASSED );\r\n'
+'      else\r\n'
+'         doSetValue( CMI_SUCCESS_STATUS, CMI_SUCCESS_STATUS_FAILED );\r\n'
+'\r\n'
+'   }\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function InitializeNonexistantInteractions(n)\r\n'
+'{\r\n'
+'   try\r\n'
+'   {\r\n'
+'        var count = doGetValue( CMI_INTERACTIONS_ID.replace(\'.n.id\', \'._count\'));\r\n'
+'        var top   = n + 1;\r\n'
+'\r\n'
+'        for (var i = count; i < top; i++)\r\n'
+'        {\r\n'
+'            doSetValue( CMI_INTERACTIONS_ID.replace(\'.n.\', \'.\' + i + \'.\'),   \'INIT\' + i );\r\n'
+'        }\r\n'
+'   }\r\n'
+'   catch (e) {}\r\n'
+'}\r\n'
+' \r\n'
+'\r\n'
+'function SCO_LoadICU()\r\n'
+'{\r\n'
+'    if ( traceSCORM_API ) alert(\'SCOFunctions SCO_LoadICU()\');\r\n'
+'\r\n'
+'    try\r\n'
+'    {\r\n'
+'        SCO_StartTimestamp = new Date();\r\n'
+' \r\n'
+'        SCO_LMS_Status = doInitialize();\r\n'
+'\r\n'
+'        //Not used, and the Meridian/MCALMS does not implement the CMI_VERSION, so this caues an error.\r\n'
+'        //if (SCO_LMS_Status == "true")\r\n'
+'        //   SCO_LMS_Version = doGetValue( CMI_VERSION );\r\n'
+'    }\r\n'
+'    catch(e)\r\n'
+'    {\r\n'
+'        alert( APP_NAME + \' SCO_LoadPage() Problem: \' + e.message );\r\n'
+'    }\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_ExitICU(manual) \r\n'
+'{\r\n'
+'    manual = (manual == undefined ? false : manual);\r\n'
+'\r\n'
+'\r\n'
+'    if (lessonUnloaded == true)\r\n'
+'       return;\r\n'
+'\r\n'
+'\r\n'
+'    var unfinished = ShowGradeDialog(manual);\r\n'
+'\r\n'
+'    if ( unfinished != \'\' && manual == true)\r\n'
+'    {\r\n'
+'       loadFrame( unfinished);\r\n'
+'       return;\r\n'
+'    }\r\n'
+'\r\n'
+'    if ( traceSCORM_API ) alert(\'SCOFunctions SCO_ExitICU()\');\r\n'
+'\r\n'
+'    SCO_EndTimestamp = new Date();\r\n'
+'\r\n'
+'    var n;\r\n'
+'  \r\n'
+'    if (SCO_LMS_Status =="true") \r\n'
+'    {\r\n'
+'        if (SCO_ExitPageStatus != true) \r\n'
+'        {\t\t\t\r\n'
+'            try\r\n'
+'            {\r\n'
+'                SCO_ExitPageStatus = true;\r\n'
+'\r\n'
+'                doSetValue( CMI_SESSION_TIME, \r\n'
+'                            SCO_CalcElapstedTime1_2( SCO_StartTimestamp, SCO_EndTimestamp ) );\r\n'
+'\r\n'
+'                doCommit();\r\n'
+'            }\r\n'
+'            catch(e)\r\n'
+'            {\r\n'
+'                alert( APP_NAME + \' SCO_ExitPage() Problem: \' + e.message );\r\n'
+'            }\r\n'
+'            finally\r\n'
+'            {\r\n'
+'                doTerminate();\r\n'
+'            }\r\n'
+'        }\r\n'
+'    }\t\r\n'
+'\r\n'
+'    try { RuntimeStopAllMultimedia( argExitFrame=true ) } catch (e) {}\r\n'
+'\r\n'
+'\r\n'
+'    // If we\'re not running in an LMS, then we\'ll close the courseware window!\r\n'
+'\r\n'
+'    //if (SCO_LMS_Status =="false")\t\r\n'
+'        window.close();\r\n'
+'\r\n'
+'\r\n'
+'    lessonUnloaded = true;\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'function SCO_LoadFrame( frameBookmarkId, bHiddenFrame )\r\n'
+'{\r\n'
+'    if ( traceSCORM_API ) alert(\'SCOFunctions SCO_LoadFrame("\' + frameBookmarkId + \'")\');\r\n'
+'\r\n'
+'    bHiddenFrame = (bHiddenFrame == undefined) ? false : bHiddenFrame;\r\n'
+'\r\n'
+'    try\r\n'
+'    {\r\n'
+'        doSetValue( CMI_LOCATION, frameBookmarkId );\r\n'
+'\r\n'
+'        if (bHiddenFrame == false)\r\n'
+'           doCommit();\r\n'
+'    }\r\n'
+'    catch (e) {}\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_ExitFrame()\r\n'
+'{\r\n'
+'    if ( traceSCORM_API ) alert(\'SCOFunctions SCO_ExitFrame()\');\r\n'
+'\r\n'
+'    try\r\n'
+'    {\r\n'
+'    }\r\n'
+'    catch (e) {}\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'function SCO_GetBookmarkLocation()\r\n'
+'{\r\n'
+'    if ( traceSCORM_API ) alert(\'SCOFunctions SCO_GetBookmarkLocation()\');\r\n'
+'\r\n'
+'    var location = \'\';\r\n'
+'\r\n'
+'    try\r\n'
+'    {\r\n'
+'        location = doGetValue( CMI_LOCATION );\r\n'
+'\r\n'
+'        if ( doGetLastError() == _DataModelElementValueNotInitialized )\r\n'
+'            location = \'\';\r\n'
+'    }\r\n'
+'    catch (e) {}\r\n'
+'\r\n'
+'    return location;\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_SetStatus_NotAttempted( latch )\r\n'
+'{\r\n'
+'    SCO_SetStatusLatched( SCO_STATUS_NOT_ATTEMPTED, latch );\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_SetStatus_Incomplete( latch )\r\n'
+'{\r\n'
+'    SCO_SetStatusLatched( SCO_STATUS_INCOMPLETE, latch );\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_SetStatus_Completed( latch )\r\n'
+'{\r\n'
+'    SCO_SetStatusLatched( SCO_STATUS_COMPLETED, latch );\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_PreviousSCOAvailable()\r\n'
+'{\r\n'
+'    var value = doGetValue( ADL_NAV_REQUEST_VALID_PREVIOUS).toLowerCase();\r\n'
+'\r\n'
+'    if ( traceSCORM_API ) alert(\'SCOFunctions SCO_PreviousSCOAvailable() \' + value);\r\n'
+'\r\n'
+'    return (value == \'true\');\r\n'
+'}\r\n'
+'\r\n'
+'function SCO_NextSCOAvailable()\r\n'
+'{\r\n'
+'    var value = doGetValue( ADL_NAV_REQUEST_VALID_CONTINUE).toLowerCase();\r\n'
+'\r\n'
+'    if ( traceSCORM_API ) alert(\'SCOFunctions SCO_NextSCOAvailable() \' + value);\r\n'
+'\r\n'
+'    return (value == \'true\');\r\n'
+'}\r\n'
+'\r\n'
+'function SCO_SetNavigation( navCommand )\r\n'
+'{\r\n'
+'    //Not used in SCORM 1.2\r\n'
+'    //navCommand = (navCommand == undefined) ? SCO_NAV_REQUEST_NONE : navCommand;\r\n'
+'\r\n'
+'    //doSetValue( ADL_NAV_REQUEST, navCommand );\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_LoadSuspendData()\r\n'
+'{\r\n'
+'   //return \'0_1|1_0\'; //for testing\r\n'
+'   return doGetValue( CMI_SUSPEND_DATA );\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_SaveSuspendData( data )\r\n'
+'{\r\n'
+'   //Suspend Data not supported in 1.2\r\n'
+'   return;\r\n'
+'   \r\n'
+'   \r\n'
+'   //alert(\'SuspendData\\n\\n\' + data);\r\n'
+'   doSetValue( CMI_EXIT,         CMI_EXIT_SUSPEND );\r\n'
+'   doSetValue( CMI_SUSPEND_DATA, data );\r\n'
+'   doCommit();\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'////////////// Supporting Routines ///////////////\r\n'
+'\r\n'
+'\r\n'
+'// Returns elapsted time in SCORM "timeinterval" form:\r\n'
+'//\r\n'
+'//  P[yY][mM][dD][T[hH][mM][s[.s]S]]\r\n'
+'//\r\n'
+'//  where:\r\n'
+'//\r\n'
+'//  • y: The number of years   (integer, >= 0, not restricted)\r\n'
+'//  • m: The number of months  (integer, >= 0, not restricted)\r\n'
+'//  • d: The number of days    (integer, >= 0, not restricted)\r\n'
+'//  • h: The number of hours   (integer, >= 0, not restricted)\r\n'
+'//  • n: The number of minutes (integer, >= 0, not restricted)\r\n'
+'//  • s: The number of seconds or fraction of seconds \r\n'
+'//       (real or integer, >= 0, not restricted). If fractions \r\n'
+'//       of a second are used, SCORM further restricts the string \r\n'
+'//       to a maximum of 2 digits (e.g., 34.45 – valid, \r\n'
+'//       34.45454545 – not valid).\r\n'
+'//\r\n'
+'//  • The character literals designators “P”,”Y”,”M”,”D”,”T”,”H”,\r\n'
+'//    ”M”,”S” shall appear if the corresponding non-zero value is \r\n'
+'//    present.\r\n'
+'//\r\n'
+'//  Example:\r\n'
+'//\r\n'
+'//  • P1Y3M2DT3H indicates a period of time of 1 year, 3 months, \r\n'
+'//    2 days and 3 hours\r\n'
+'//  • PT3H5M indicates a period of time of 3 hours and 5 minutes\r\n'
+'\r\n'
+'\r\n'
+'function SCO_CalcElapstedTime( startTimestamp, endTimestamp )\r\n'
+'{\r\n'
+'   var diff = Math.floor( (( endTimestamp) - startTimestamp ) / 1000);\r\n'
+'\r\n'
+'    var years  = 0;\r\n'
+'    var months = 0;\r\n'
+'    var days   = 0;\r\n'
+'\r\n'
+'    var csecs  = Math.floor(((endTimestamp - startTimestamp) % 1000) / 10);\r\n'
+'    var secs   = Math.floor( diff % 60);\r\n'
+'    var mins   = Math.floor( diff / 60) % 60;\r\n'
+'    var hours  = Math.floor( diff / 3600);\r\n'
+'\r\n'
+'    return \'P\' + \r\n'
+'           years  + \'Y\' +\r\n'
+'           months + \'M\' +\r\n'
+'           days   + \'D\' +\r\n'
+'           \'T\' +\r\n'
+'           hours  + \'H\' +\r\n'
+'           mins   + \'M\' +\r\n'
+'           secs   + \'.\' + (\'00\'+csecs  ).replace(/.*?(\\d{2})$/,\'\\$1\') + \'S\';\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function SCO_CalcElapstedTime1_2( startTimestamp, endTimestamp )\r\n'
+'{\r\n'
+'   var diff = Math.floor( (( endTimestamp) - startTimestamp ) / 1000);\r\n'
+'\r\n'
+'    var years  = 0;\r\n'
+'    var months = 0;\r\n'
+'    var days   = 0;\r\n'
+'\r\n'
+'    var csecs  = Math.floor(((endTimestamp - startTimestamp) % 1000) / 10);\r\n'
+'    var secs   = Math.floor( diff % 60);\r\n'
+'    var mins   = Math.floor( diff / 60) % 60;\r\n'
+'    var hours  = Math.floor( diff / 3600);\r\n'
+'\r\n'
+'    return (\'0000\' + (hours+0)).replace(/.*?(\\d{4,4})$/, \'\\$1\') + \':\' +\r\n'
+'           (\'00\'   + (mins +0)).replace(/.*?(\\d{2,2})$/, \'\\$1\') + \':\' +\r\n'
+'           (\'00\'   + (secs +0)).replace(/.*?(\\d{2,2})$/, \'\\$1\') + \'.\' +\r\n'
+'           (\'00\'   + (csecs+0)).replace(/.*?(\\d{2,2})$/, \'\\$1\');\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'function SCO_SetStatusLatched( status, latch )\r\n'
+'{\r\n'
+'    if ( traceSCORM_API ) alert(\'SCOFunctions SCO_SetStatusLatched("\' + status + \'")\');\r\n'
+'\r\n'
+'    try\r\n'
+'    {\r\n'
+'        latch = (latch != undefined) ? latch : false;\r\n'
+'\r\n'
+'        if ( latch )\r\n'
+'        {\r\n'
+'            var currentStatus = doGetValue( CMI_COMPLETION_STATUS );\r\n'
+'\r\n'
+'            if ( currentStatus == SCO_STATUS_UNKNOWN )\r\n'
+'                currentStatus = SCO_STATUS_NOT_ATTEMPTED;\r\n'
+'\r\n'
+'\r\n'
+'            if ( currentStatus == SCO_STATUS_NOT_ATTEMPTED )\r\n'
+'            {\r\n'
+'                if ( status == SCO_STATUS_INCOMPLETE ||\r\n'
+'                     status == SCO_STATUS_COMPLETED)\r\n'
+'                {\r\n'
+'                    doSetValue( CMI_COMPLETION_STATUS, status );\r\n'
+'                    doCommit();\r\n'
+'                }\r\n'
+'            }\r\n'
+'            else\r\n'
+'            if ( currentStatus == SCO_STATUS_INCOMPLETE )\r\n'
+'            {\r\n'
+'                if ( status == SCO_STATUS_COMPLETED )\r\n'
+'                {\r\n'
+'                    doSetValue( CMI_COMPLETION_STATUS, status );\r\n'
+'                    doCommit();\r\n'
+'                }\r\n'
+'            }\r\n'
+'            else\r\n'
+'            if ( currentStatus == SCO_STATUS_COMPLETED )\r\n'
+'            {\r\n'
+'                // Do nothing...\r\n'
+'            }\r\n'
+'        }\r\n'
+'        else\r\n'
+'        {\r\n'
+'            doSetValue( CMI_COMPLETION_STATUS, status );\r\n'
+'            doCommit();\r\n'
+'        }\r\n'
+'    }\r\n'
+'    catch (e) {}\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+''
  , function (e) { if(e){return err(e)} chain[step++]() });

});



chain.push(function createHTML1 () {
  fs.writeFile( path.resolve(tmp, 'ICU_' + contentUuid, 'index.html'),
 '<script id="SUPPORTING_ROUTINES" type="text/javascript">\r\n'
+'  //non-xml interface if not in C3 editor, preview mode or C3 portal \r\n'
+'  //make sure data.js is created with frame_extractor.html\r\n'
+'   if(document.location.href.toUpperCase().indexOf("EDITMODE=TRUE") == -1 & document.location.href.toUpperCase().indexOf("PREVIEWMODE=TRUE") == -1 & document.location.href.toUpperCase().indexOf("C3_PUBLISH") == -1)   {  \r\n'
+'     document.location = "Media/interface.html";\r\n'
+'   }\r\n'
+'///\r\n'
+'/// IE/Wc3/Safari: Load and return an XML document\r\n'
+'///\r\n'
+'\r\n'
+'function C3LoadXMLDocument(uri, noXPathUse)\r\n'
+'{\r\n'
+'    noXPathUse = (noXPathUse ? noXPathUse : false);\r\n'
+'\r\n'
+'    var doc = null;\r\n'
+'\r\n'
+'    try\r\n'
+'    {\r\n'
+'        //Wc3 DOM\r\n'
+'        if (document.implementation.createDocument)\r\n'
+'            doc = document.implementation.createDocument("", "", null);\r\n'
+'\r\n'
+'        //IE DOM\r\n'
+'        else\r\n'
+'        if (C3HasActiveXObject())\r\n'
+'        {\r\n'
+'            doc = new ActiveXObject("Microsoft.XMLDOM");\r\n'
+'\r\n'
+'            if (!noXPathUse)\r\n'
+'                doc.setProperty("SelectionLanguage", "XPath");\r\n'
+'        }\r\n'
+'\r\n'
+'        if (doc != null)\r\n'
+'        {\r\n'
+'            try\r\n'
+'            {\r\n'
+'                doc.async = false;\r\n'
+'                doc.load(uri);\r\n'
+'            }\r\n'
+'            catch (e) //SAFARI DOM\r\n'
+'            {\r\n'
+'                try\r\n'
+'                {\r\n'
+'                    var req = new XMLHttpRequest();\r\n'
+'\r\n'
+'                    req.open("GET", uri, argAsync=false);\r\n'
+'\r\n'
+'                    req.send("");\r\n'
+'\r\n'
+'                    doc = new DOMParser().parseFromString( \'<xml/>\', \'application/xml\');\r\n'
+'                    doc = doc.loadXML( req.responseText);\r\n'
+'                }\r\n'
+'                catch (e)\r\n'
+'                {\r\n'
+'                    throw(e);\r\n'
+'                }\r\n'
+'            }\r\n'
+'        }\r\n'
+'        else\r\n'
+'            throw("No method in DOM to do this!");\r\n'
+'    }\r\n'
+'    catch (e)\r\n'
+'    {\r\n'
+'        W3CCheckThatWeCanFetchXMLFromDisk();\r\n'
+'    }\r\n'
+'\r\n'
+'\r\n'
+'   return doc;\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'///\r\n'
+'/// Test to see if we can fetch an xml document from the local disk. If we can\'t\r\n'
+'/// it probably means that the security settings of the browser will need to be\r\n'
+'/// adjusted by the user or admin.\r\n'
+'///\r\n'
+'\r\n'
+'function W3CCheckThatWeCanFetchXMLFromDisk()\r\n'
+'{\r\n'
+'    var uri = \'../../\' + icuName + \'/C3ICU.xml\';\r\n'
+'\r\n'
+'    try\r\n'
+'    {\r\n'
+'        var doc = null;\r\n'
+'\r\n'
+'        //Wc3 DOM\r\n'
+'        if (document.implementation.createDocument)\r\n'
+'            doc = document.implementation.createDocument("", "", null);\r\n'
+'\r\n'
+'        if (doc != null)\r\n'
+'        {\r\n'
+'            try\r\n'
+'            {\r\n'
+'                doc.async = false;\r\n'
+'                doc.load(uri);\r\n'
+'            }\r\n'
+'            catch (e) //SAFARI DOM\r\n'
+'            {\r\n'
+'                try\r\n'
+'                {\r\n'
+'                    var req = new XMLHttpRequest();\r\n'
+'\r\n'
+'                    req.open("GET", uri, argAsync=false);\r\n'
+'\r\n'
+'                    req.send("");\r\n'
+'\r\n'
+'                    doc = new DOMParser().parseFromString( \'<xml/>\', \'application/xml\');\r\n'
+'                    doc = doc.loadXML( req.responseText);\r\n'
+'                }\r\n'
+'                catch (e)\r\n'
+'                {\r\n'
+'                    throw(e);\r\n'
+'                }\r\n'
+'            }\r\n'
+'        }\r\n'
+'    }\r\n'
+'    catch (e)\r\n'
+'    {\r\n'
+'        var browser  = \'This web browser\\\'s\';\r\n'
+'        var settings = \'\';\r\n'
+'\r\n'
+'        var messageWrapper = \r\n'
+'               \'javascript:"\' +\r\n'
+'               \'<html>\' +\r\n'
+'                 \'<head>\' +\r\n'
+'                   \'<title>C3 Courseware Runtime Reports</title>\' +\r\n'
+'                   \'<style>td {font: 14pt sans-serif}</style>\' +\r\n'
+'                 \'<head>\' +\r\n'
+'                 \'<body>\' +\r\n'
+'                   \'<table width=100% height=100%>\' +\r\n'
+'                     \'<tr>\' +\r\n'
+'                       \'<td align=center>\' +\r\n'
+'                         \'$BROWSER$ security is currently too strict to allow this courseware to run.\' +\r\n'
+'                         \'<p>\' +\r\n'
+'                         \'Please ask your IT administrator set this browser\\\'s advanced settings:\' +\r\n'
+'                         \'<p>\' +                         \r\n'
+'                         \'$SETTINGS$\' + \r\n'
+'                         \'<p>\' +\r\n'
+'                         \'(The test performed was that of fetching an XML document.)\' +\r\n'
+'                       \'</td>\' +\r\n'
+'                     \'</tr>\' +\r\n'
+'                   \'</table>\' +\r\n'
+'                 \'</body>\' +\r\n'
+'               \'</html>\' +\r\n'
+'               \'"\';\r\n'
+'\r\n'
+'\r\n'
+'        if (String(e).indexOf(\'code: "1012"\') >= 0)\r\n'
+'        {   \r\n'
+'            browser  = \'FireFox browser\';   \r\n'
+'            settings = \r\n'
+'                \'<b>security.fileuri.strict_origin_policy</b> to <b>false</b>.\' + \r\n'
+'                \'<p>\' +\r\n'
+'                \'<b>dom.allow_scripts_to_close_windows</b> to <b>true</b>.\';\r\n'
+'        }\r\n'
+'\r\n'
+'\r\n'
+'        if (String(e).indexOf(\'XMLHttpRequest Exception 101\') >= 0)\r\n'
+'        {   \r\n'
+'            browser  = \'Chrome browser\';   \r\n'
+'            settings = \r\n'
+'                \'Please add the following command line options to Chrome:\' +\r\n'
+'                \'<p>\' +\r\n'
+'                \'<b>--allow-allow-file-access-from-files</b>\' +\r\n'
+'                \'<p>\' +\r\n'
+'                \'<b>--always-authorize-plugins</b>\'       \r\n'
+'        }\r\n'
+'\r\n'
+'        window.location.href = messageWrapper.replace(\'$BROWSER$\', browser).replace(\'$SETTINGS$\', settings);    \r\n'
+'    }   \r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'///\r\n'
+'/// IE/Wc3: Returns true if it\'s possible to create an ActiveX object.\r\n'
+'///         This is a quick way to test that the browser is IE\r\n'
+'\r\n'
+'function C3HasActiveXObject()\r\n'
+'{\r\n'
+'    return (typeof(ActiveXObject) != \'undefined\');\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'///\r\n'
+'/// IE/Wc3: Returns the xml of a node or document.\r\n'
+'///\r\n'
+'\r\n'
+'function C3GetOuterXML(obj)\r\n'
+'{\r\n'
+'    try\r\n'
+'    {\r\n'
+'        //Wc3 DOM\r\n'
+'        if (obj.outerXML)\r\n'
+'            return obj.outerXML();\r\n'
+'\r\n'
+'        //IE DOM\r\n'
+'        if (obj.xml)\r\n'
+'            return obj.xml;\r\n'
+'    }\r\n'
+'    catch (e)\r\n'
+'    {\r\n'
+'        C3ReportError(\'ICU\\\'s index.html\', \'C3GetXML\', e, \'failed\');\r\n'
+'    }\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'///\r\n'
+'/// IE/Wc3: Report an error to the end-user\r\n'
+'///\r\n'
+'\r\n'
+'function C3ReportError( fileName, functionName, errObj, messageText)\r\n'
+'{\r\n'
+'    var txt = \'C3 Runtime Error: \' + fileName + \'  \' + functionName + \'()\\n\\n\';\r\n'
+'\r\n'
+'    if (errObj == null || errObj == undefined)\r\n'
+'        txt += messageText;\r\n'
+'    else\r\n'
+'    //IE DOM\r\n'
+'    if (errObj.description)\r\n'
+'        txt += errObj.description + \'\\n\\n\' + messageText;\r\n'
+'    //Wc3 DOM\r\n'
+'    else\r\n'
+'        txt += errObj + \'\\n\\n\' + messageText;\r\n'
+'\r\n'
+'    alert(txt);   \r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'///\r\n'
+'/// Add various features to the DOM...\r\n'
+'///\r\n'
+'\r\n'
+'///\r\n'
+'/// Add selectNodes() and selectSingleNode() methods to W3C DOM\r\n'
+'///\r\n'
+'\r\n'
+'if( document.implementation.hasFeature("XPath", "3.0") ) \r\n'
+'{\r\n'
+'    XMLDocument.prototype.loadXML = function(xString)\r\n'
+'    {\r\n'
+'        if (window.DOMParser != undefined)\r\n'
+'        {\r\n'
+'            var doc = new DOMParser().parseFromString( xString, \'application/xml\');\r\n'
+'\r\n'
+'            if (doc.documentElement.namespaceURI ===\r\n'
+'                \'http://www.mozilla.org/newlayout/xml/parsererror.xml\' &&\r\n'
+'                doc.documentElement.tagName === \'parsererror\')\r\n'
+'            {\r\n'
+'                this.parseError = new Object();\r\n'
+'                this.parseError.errorCode = -1; //set this to something reasonable\r\n'
+'                this.parseError.reason    = doc.documentElement.firstChild.nodeValue;\r\n'
+'\r\n'
+'                var xml = C3GetOuterXML(doc).replace(/\\r|\\n/g,\' \');\r\n'
+'\r\n'
+'                var errorDescription = doc.documentElement.firstChild.nodeValue;\r\n'
+'\r\n'
+'                var srcText = xml.replace(/^.*?<sourcetext>(.*?)<.*$/,\'$1\'\r\n'
+'                                ).replace(\'&lt;\', \'<\'\r\n'
+'                                ).replace(\'&gt;\', \'>\'\r\n'
+'                                ).replace(\'&amp;\', \'&\');\r\n'
+' \r\n'
+'                var line    = xml.replace(/^.*? Line Number (\\d+),.*$/, \'$1\');\r\n'
+'                var linepos = xml.replace(/^.*?, Column (\\d+):.*$/, \'$1\');\r\n'
+'\r\n'
+'                var filepos = 0;\r\n'
+'\r\n'
+'                if (xString.indexOf(\'\\r\') >= 0)\r\n'
+'                    try {filepos = xString.split(\'\\r\\n\').slice(0,line-2).join(\'\\r\\n\').length + linepos} catch (e) {}\r\n'
+'                else\r\n'
+'                    try {filepos = xString.split(\'\\n\'  ).slice(0,line-2).join(\'\\n\'  ).length + linepos} catch (e) {}\r\n'
+'\r\n'
+'                this.parseError.filepos = filepos;\r\n'
+'                this.parseError.linepos = linepos;\r\n'
+'                this.parseError.line    = line;\r\n'
+'                this.parseError.srcText = srcText;\r\n'
+'                this.parseError.url     = \'Loaded from string.\';\r\n'
+'\r\n'
+'                //alert(errorDescription + \'\\n\\n------\\n\\n\' + this.parseError.srcText + \'\\n\\nline: \' + this.parseError.line + \'\\n\\ncolumn: \' + this.parseError.linepos + \'\\n\\nfilepos: \' + filepos + \'\\n\\nxString length: \' + xString.length);\r\n'
+'\r\n'
+'                doc = null;               \r\n'
+'            }\r\n'
+'            else\r\n'
+'\r\n'
+'            return doc;\r\n'
+'        }\r\n'
+'    }\r\n'
+'\r\n'
+'\r\n'
+'    // selectNodes() - prototying the XMLDocument \r\n'
+'    XMLDocument.prototype.selectNodes = function(cXPathString, xNode) \r\n'
+'    { \r\n'
+'        if( !xNode ) { xNode = this; }\r\n'
+'\r\n'
+'        var oNSResolver = this.createNSResolver(this.documentElement) \r\n'
+'        var aItems      = this.evaluate(cXPathString, xNode, oNSResolver,\r\n'
+'                           XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null) \r\n'
+'        var aResult = [];\r\n'
+'\r\n'
+'        for( var i = 0; i < aItems.snapshotLength; i++)  \r\n'
+'            aResult[i] = aItems.snapshotItem(i);\r\n'
+'\r\n'
+'        return aResult;\r\n'
+'    } \r\n'
+'\r\n'
+'    // selectNodes() - prototying the Element \r\n'
+'    Element.prototype.selectNodes = function(cXPathString) \r\n'
+'    { \r\n'
+'        if(this.ownerDocument.selectNodes) \r\n'
+'            return this.ownerDocument.selectNodes(cXPathString, this);\r\n'
+'        else\r\n'
+'           throw "For XML Elements Only";\r\n'
+'    }\r\n'
+'\r\n'
+'\r\n'
+'    // selectSingleNode() - prototying the XMLDocument \r\n'
+'    XMLDocument.prototype.selectSingleNode = function(cXPathString, xNode) \r\n'
+'    { \r\n'
+'        if( !xNode ) { xNode = this; }\r\n'
+'\r\n'
+'        var xItems = this.selectNodes(cXPathString, xNode);\r\n'
+'\r\n'
+'        if( xItems.length > 0 ) \r\n'
+'        { \r\n'
+'            return xItems[0];\r\n'
+'        } \r\n'
+'        else \r\n'
+'        { \r\n'
+'            return null;\r\n'
+'        } \r\n'
+'    } \r\n'
+'\r\n'
+'    // selectSingleNode() - prototying the Element \r\n'
+'    Element.prototype.selectSingleNode = function(cXPathString) \r\n'
+'    {\r\n'
+'        if(this.ownerDocument.selectSingleNode) \r\n'
+'        { \r\n'
+'            return this.ownerDocument.selectSingleNode(cXPathString, this);\r\n'
+'        } \r\n'
+'            else{throw "For XML Elements Only";} \r\n'
+'    }\r\n'
+'\r\n'
+'\r\n'
+'    // xml property - prototying the XMLDocument  \r\n'
+'\r\n'
+'    XMLDocument.prototype.outerXML = function()\r\n'
+'    {\r\n'
+'        return (new XMLSerializer()).serializeToString(this);\r\n'
+'    }\r\n'
+'\r\n'
+'\r\n'
+'    // xml property - prototying the Element  \r\n'
+'\r\n'
+'    Element.prototype.outerXML = function()\r\n'
+'    {\r\n'
+'        return (new XMLSerializer()).serializeToString(this);\r\n'
+'    }\r\n'
+'}\r\n'
+'\r\n'
+'</script>\r\n'
+'\r\n'
+'\r\n'
+'<script type="text/javascript">\r\n'
+'\r\n'
+'var loc = window.location.href.split(\'/\'); loc.pop(); var icuName = loc.pop();\r\n'
+'\r\n'
+'var search = window.location.search;\r\n'
+'\r\n'
+'document.title = unescape(icuName);\r\n'
+'\r\n'
+'var xml = C3LoadXMLDocument(\'C3ICU.xml\')\r\n'
+'\r\n'
+'var interface = xml.selectSingleNode(\'/ICU/@Interface\').value;\r\n'
+'\r\n'
+'var path = \'../Interfaces/\' + interface + \'/interface.html\';\r\n'
+'\r\n'
+'try\r\n'
+'{\r\n'
+'    if (search == "")\r\n'
+'        search =  "?";\r\n'
+'    else\r\n'
+'        search += "&";\r\n'
+'\r\n'
+'    search += "icuName=" + icuName;\r\n'
+'\r\n'
+'    window.location.href = path + search;\r\n'
+'}\r\n'
+'catch (e)\r\n'
+'{\r\n'
+'    alert(\r\n'
+'        \'The C3 Courseware Runtime reports that:\\n\\n\' +\r\n'
+'        \'The required interface \\\'\' + interface + \'\\\' could not be found!\\n\\n\' +\r\n'
+'        \'This ICU cannot open without it.\');\r\n'
+'}\r\n'
+'\r\n'
+'</script>'
  , function (e) { if(e){return err(e)} chain[step++]() });

});



chain.push(function createHTML2 () {
  fs.writeFile( path.resolve(tmp, 'index.html'), 
 '<script language="javascript">\r\n'
+'\r\n'
+'var color            = \'#DDDDDD\';\r\n'
+'var backgroundColor  = \'#537ca2\';\r\n'
+'var highlightColor   = \'rgb(255,200,0)\';\r\n'
+'var activeColor      = \'white\';\r\n'
+'\r\n'
+'var splitWidth       = \'200\';\r\n'
+'\r\n'
+'var openedNow        = false;\r\n'
+'var flyEffect        = false;\r\n'
+'var effectStartDelay = 500;\r\n'
+'var effectStepDelay  = 1;\r\n'
+'\r\n'
+'/////////////////////////////////////////////////////////////////\r\n'
+'//\r\n'
+'// Pico LMS 2004: Launches courseware outlines in the SCORM\r\n'
+'// manifiest.\r\n'
+'//\r\n'
+'// Run this page from the same folder as the scorm manifest\r\n'
+'//\r\n'
+'// B.Blatchley, D.P. Associates (c)2005,2006,2007\r\n'
+'// bblatchley@dpatraining.com\r\n'
+'//\r\n'
+'/////////////////////////////////////////////////////////////////\r\n'
+'\r\n'
+'\r\n'
+'var currentICU    = undefined;\r\n'
+'var nextDirection = undefined;\r\n'
+'var lmsNavigated  = false;\r\n'
+'\r\n'
+'var writeNav = function()\r\n'
+'{\r\n'
+'   var o = \'\';\r\n'
+'\r\n'
+'   manif = GetLaunchDataFromSCORMMainifest(\'\');\r\n'
+'\r\n'
+'\r\n'
+'   o = ((((\r\n'
+'       \'<s\' + \'cript language="javascript">\\n\' +\r\n'
+'          \'function LightupSelectedICU(elm)\\n\' +\r\n'
+'          \'{\\n\' +\r\n'
+'          \'   setTimeout( function() { LightupSelectedICU_(elm) } , 20);\\n\' +\r\n'
+'          \'}\\n\' +\r\n'
+'          \'function LightupSelectedICU_( elm )\\n\' +\r\n'
+'          \'{\\n\' +\r\n'
+'          \'   var tds = document.getElementsByTagName(\\\'TD\\\');\\n\' +\r\n'
+'          \'   for (var i = 0; i < tds.length; i++)\\n\' +\r\n'
+'          \'   {\\n\' +\r\n'
+'          \'      if (tds[i].className == \\\'hi\\\' || tds[i].className == \\\'act\\\')\\n\' +\r\n'
+'          \'         tds[i].className = \\\'lo\\\';\\n\' +\r\n'
+'          \'   }\\n\' +\r\n'
+'          \'   elm.className = \\\'act\\\';\\n\' +\r\n'
+'          \'}\\n\' +\r\n'
+'       \'</s\' + \'cript>\\n\' +\r\n'
+'       \'<html>\' +\r\n'
+'         \'<head>\' +\r\n'
+'           \'<style>\' +\r\n'
+'             \'body   {background-color: _BCOLOR_;        color: _FCOLOR_;}\' +\r\n'
+'             \'td     {font: normal 10pt/13pt sans-serif; color: _FCOLOR_;}\' +\r\n'
+'             \'td.lo  {font: normal 10pt/13pt sans-serif; color: _FCOLOR_; cursor: hand;}\' +\r\n'
+'             \'td.hi  {font: normal 10pt/13pt sans-serif; color: _HCOLOR_; cursor: hand;}\' +\r\n'
+'             \'td.act {font: bold   10pt/13pt sans-serif; color: _ACOLOR_; cursor: hand;}\' +\r\n'
+'             \'td.hd  {font: italic 12pt/14pt sans-serif; color: _FCOLOR_; cursor: default;}\' +\r\n'
+'             \'td.ln  {font: 0/0 monospace; height:5;}\' +\r\n'
+'             \'.txt   {text-decoration: none; cursor: hand;}\' +\r\n'
+'           \'</style>\' +\r\n'
+'         \'</head>\' +\r\n'
+'         \'<body oncontextmenu="return false;" unselectable="on">\' +\r\n'
+'           \'<table id=navTable width=100% height=100% style="display:none"><tr><td align=center unselectable=on>\' +\r\n'
+'             \'<table unselectable=on>\' +\r\n'
+'               \'<tr>\' +\r\n'
+'                 \'<td class=hd unselectable=on>_MAINTITLE_</td>\' +\r\n'
+'               \'</tr>\'\r\n'
+'        ).replace(/_FCOLOR_/g, color)\r\n'
+'        ).replace(/_BCOLOR_/g, backgroundColor)\r\n'
+'        ).replace(/_ACOLOR_/g, activeColor)\r\n'
+'        ).replace(/_HCOLOR_/g, highlightColor);\r\n'
+'\r\n'
+'               for (var i = 0; i < manif.sco.length; i++)\r\n'
+'               {\r\n'
+'                  var s     = manif.sco[i];\r\n'
+'                  var fnc   = s.id.replace(/-/g,\'_\');\r\n'
+'                  var href  = s.href.replace(/\\\\/g,\'/\') + "?SCORMNAV=FLOW";\r\n'
+'                  var title = s.title;\r\n'
+'\r\n'
+'                  o += (((((\r\n'
+'                        \'<s\' + \'cript>\' +\r\n'
+'                        \'var f__FNC_ = function(lmsNav) \' +\r\n'
+'                        \'{\' +\r\n'
+'                        \'   lmsNav = (lmsNav == undefined ? true : lmsNav);\' +\r\n'
+'                        \'   parent.lmsNavigated = lmsNav;\' +\r\n'
+'                        \'   parent.currentICU = "f__FNC_";\' +\r\n'
+'                        \'   parent.content.name = "content";\' +\r\n'
+'                        \'   open("_PATH__HREF_","content","");\' +\r\n'
+'                        \'}\' +\r\n'
+'                        ((i == 0) ? \'\\r\\nsetTimeout( "f__FNC_(false)", 200);\' : \'\') +\r\n'
+'                        \'</s\' + \'cript>\\r\\n\' +\r\n'
+'                        \'<tr unselectable="on"><td class=ln unselectable="on">&nbsp;</td></tr>\\r\\n\' +\r\n'
+'                        \'<tr unselectable="on"><td class=_CLASS_ id="aChoice" unselectable="on" \' +\r\n'
+'                          \'onmouseover="if (this.className != \\\'act\\\') {this.className=\\\'hi\\\'}" onmouseout="if (this.className != \\\'act\\\') {this.className=\\\'lof\\\'}" \' +\r\n'
+'                          \'onclick="LightupSelectedICU(this); f__FNC_()" title="_TITLE_" \' +\r\n'
+'                        \'><span class=txt unselectable="on" \' +\r\n'
+'                          \'onclick="f__FNC_()" title="_TITLE_" \' +\r\n'
+'                        \'>_TITLE_\' +\r\n'
+'                        \'</span></td></tr>\\r\\n\'\r\n'
+'                       ).replace(/_FNC_/g,   fnc)\r\n'
+'                       ).replace(/_TITLE_/g, title)\r\n'
+'                       ).replace(/_PATH_/,   manif.path)\r\n'
+'                       ).replace(/_HREF_/,   href)\r\n'
+'                       ).replace(/_CLASS_/,  (i == 0 ? \'act\' : \'lo\'));\r\n'
+'               }\r\n'
+'\r\n'
+'   o +=      \'</table>\' +\r\n'
+'           \'</td></tr></table>\' +\r\n'
+'         \'</body>\' +\r\n'
+'       \'</html>\';\r\n'
+'\r\n'
+'   o = o.replace(/_MAINTITLE_/gm, manif.title);\r\n'
+'\r\n'
+'   frames[\'nav\'].document.write(o);\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'function writeSplitter()\r\n'
+'{\r\n'
+'    var s = "";\r\n'
+'\r\n'
+'    s += "" +\r\n'
+'         "<" + "script id=\\"LIBRARY_SPLITTER\\" language=\\"jscript\\">\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "var opened = true;\\n" +\r\n'
+'         "var defaultOpenWidth = 250;\\n" +\r\n'
+'         "var openMessage      = \'Click here to open the TOC\';\\n" +\r\n'
+'         "var closeMessage     = \'Click here to close the TOC\';\\n" +\r\n'
+'         "var bgColor          = \'buttonface\';\\n" +\r\n'
+'         "var fgColor          = \'buttontext\';\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "function Initialize() \\n" +\r\n'
+'         "{\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "   splitterTable.style.backgroundColor = bgColor;\\n" +\r\n'
+'         "   splitterTable.style.color           = fgColor;\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "   buttonHole.style.borderTopColor    = fgColor;\\n" +\r\n'
+'         "   buttonHole.style.borderBottomColor = fgColor;\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "   Button.style.backgroundColor = bgColor;\\n" +\r\n'
+'         "   Button.style.color           = fgColor;\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "   Button.innerText = (opened == true ? \'3\' : \'4\');\t\\n" +\r\n'
+'         "}\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "\\n";\r\n'
+'    s += "" +\r\n'
+'         "function Button_Click() \\n" +\r\n'
+'         "{\\n" +\r\n'
+'         "   var width;\\n" +\r\n'
+'         "status=\'click\' + new Date();\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "   if(opened == false) {\\n" +\r\n'
+'         "      opened            = true;\\n" +\r\n'
+'         "      Button.innerText = \'4\';\\n" +\r\n'
+'         "      Button.title     = openMessage;\\n" +\r\n'
+'         "      width            = 0;\\n" +\r\n'
+'         "   }\\n" +\r\n'
+'         "   else \\n" +\r\n'
+'         "   {\\n" +\r\n'
+'         "      opened            = false;\\n" +\r\n'
+'         "      Button.innerText = \'3\';\t\\n" +\r\n'
+'         "      Button.title     = closeMessage;\\n" +\r\n'
+'         "      width            = defaultOpenWidth;\\n" +\r\n'
+'         "   }\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "   parent.master.cols = \\"\\" + width + \\",7,*\\";\t\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "   event.cancelBubble = true;\\n" +\r\n'
+'         "}\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "function Button_Over() \\n" +\r\n'
+'         "{\\n" +\r\n'
+'         "   Button.style.backgroundColor = fgColor;\\n";\r\n'
+'    s += "" +\r\n'
+'         "   Button.style.color           = bgColor;\\n" +\r\n'
+'         "   event.cancelBubble = true;\\n" +\r\n'
+'         "}\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "function Button_Out() \\n" +\r\n'
+'         "{\\n" +\r\n'
+'         "   Button.style.backgroundColor = bgColor;\\n" +\r\n'
+'         "   Button.style.color           = fgColor;\\n" +\r\n'
+'         "   event.cancelBubble = true;\\n" +\r\n'
+'         "}\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "var Sizing = false;\\n" +\r\n'
+'         "var Sx     = 0;\\n" +\r\n'
+'         "var Wx     = 0;\\n" +\r\n'
+'         "var M      = 0;\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "function StartSizing() \\n" +\r\n'
+'         "{\\n" +\r\n'
+'         "   Sizing = true;\\n";\r\n'
+'    s += "" +\r\n'
+'         "   GetSize();\\n" +\r\n'
+'         "}\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "function ChangeSize() \\n" +\r\n'
+'         "{\\n" +\r\n'
+'         "   if( Sizing == true)\\n" +\r\n'
+'         "      Resize();\\n" +\r\n'
+'         "}\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "function GetSize() \\n" +\r\n'
+'         "{\\n" +\r\n'
+'         "  M  = parent.document.body.clientWidth - 100;\\n" +\r\n'
+'         "  Sx = event.screenX;\\n" +\r\n'
+'         "  Wx = parseInt(String(parent.master.cols).substring(0,String(parent.master.cols).lastIndexOf(\\",7\\")));\\n" +\r\n'
+'         "}\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "function Resize() \\n" +\r\n'
+'         "{\\n" +\r\n'
+'         "   var X = Wx + event.screenX - Sx;\\n" +\r\n'
+'         "\\n";\r\n'
+'    s += "" +\r\n'
+'         "   if(X <= 0) \\n" +\r\n'
+'         "   {\\n" +\r\n'
+'         "      T_COLS = \\"0,7,*\\";\\n" +\r\n'
+'         "      parent.splitter.Button.innerText = \'4\';\\n" +\r\n'
+'         "      parent.splitter.Button.title = openMessage;\\n" +\r\n'
+'         "      parent.splitter.opened        = true;\\n" +\r\n'
+'         "   }\t  \\n" +\r\n'
+'         "   else \\n" +\r\n'
+'         "   {\\n" +\r\n'
+'         "      T_COLS = (X > M ? M : X) + \\",7,*\\";\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "      parent.splitter.Button.innerText = \'3\';\\n" +\r\n'
+'         "      parent.splitter.Button.title     = closeMessage;\\n" +\r\n'
+'         "      parent.splitter.opened            = false;\t  \\n" +\r\n'
+'         "   }\\n" +\r\n'
+'         "   parent.master.cols =  T_COLS;\t\\n" +\r\n'
+'         "}\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "function StopSizing() \\n" +\r\n'
+'         "{\\n" +\r\n'
+'         "  Sizing = false;\\n" +\r\n'
+'         "}\\n";\r\n'
+'    s += "" +\r\n'
+'         "\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "</" + "script>\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "\\n" +\r\n'
+'         "<html>\\n" +\r\n'
+'         "  <head>\\n" +\r\n'
+'         "    <meta http-equiv=\\"Content-Type\\" content=\\"text/html; charset=iso-8859-1\\">\\n" +\r\n'
+'         "    <title></title> \\n" +\r\n'
+'         "    <style>\\n" +\r\n'
+'         "      body {\\n" +\r\n'
+'         "        margin:\t\t\t0px;\\n" +\r\n'
+'         "      }\\n" +\r\n'
+'         "      table {\\n" +\r\n'
+'         "        cursor:\t\t\tw-resize;\\n" +\r\n'
+'         "      }\\n" +\r\n'
+'         "      .button {\\n" +\r\n'
+'         "        width:\t\t\t7px;\\n" +\r\n'
+'         "        height:\t\t\t50px;\\n" +\r\n'
+'         "        cursor:\t\t\thand;\\n" +\r\n'
+'         "\tfont:\t\t\t9px webdings;\\n" +\r\n'
+'         "\tborder-top-width:\t1px;\\n" +\r\n'
+'         "        border-top-style:\tsolid;\\n";\r\n'
+'    s += "" +\r\n'
+'         "        border-bottom-width:\t1px;\\n" +\r\n'
+'         "        border-bottom-style:\tsolid;\\n" +\r\n'
+'         "        vertical-align:\t\tmiddle;\\n" +\r\n'
+'         "      }\\n" +\r\n'
+'         "    </style>\\n" +\r\n'
+'         "  </head>\\n" +\r\n'
+'         "  <body unselectable=\\"on\\" \\n" +\r\n'
+'         "    onMouseDown = \\"StartSizing()\\" \\n" +\r\n'
+'         "    onMouseMove = \\"ChangeSize()\\" \\n" +\r\n'
+'         "    onMouseUp   = \\"StopSizing()\\"\\n" +\r\n'
+'//         "    onLoad      = \\"Button_Click()\\"\\n" +\r\n'
+'         "  >\\n" +\r\n'
+'         "    <table id=\\"splitterTable\\" height=\\"100%\\" cellpadding=\\"0\\" cellspacing=\\"0\\" unselectable=\\"on\\">\\n" +\r\n'
+'         "      <tr unselectable=\\"on\\">\\n" +\r\n'
+'         "        <td unselectable=\\"on\\">\\n" +\r\n'
+'         "          <table id=\\"buttonHole\\" class=\\"button\\" cellpadding=\\"0\\" cellspacing=\\"0\\" unselectable=\\"on\\" " +\r\n'
+'         "            onClick = \\"Button_Click()\\"\\n" +\r\n'
+'         "          >\\n" +\r\n'
+'         "            <tr unselectable=\\"on\\">\\n" +\r\n'
+'         "              <td id=Button unselectable=\\"on\\"\\n" +\r\n'
+'         "                onMouseDown = \\"Button_Click()\\" \\n" +\r\n'
+'         "                onMouseOver = \\"Button_Over()\\" \\n" +\r\n'
+'         "                onMouseOut  = \\"Button_Out()\\"\\n" +\r\n'
+'         "                onMouseMove = \\"event.cancelBubble = true\\"\\n" +\r\n'
+'         "              >&nbsp;</td>\\n";\r\n'
+'    s += "" +\r\n'
+'         "            </tr>\\n" +\r\n'
+'         "          </table>\\n" +\r\n'
+'         "        </td>\\n" +\r\n'
+'         "      </tr>\\n" +\r\n'
+'         "    </table>\\n" +\r\n'
+'         "  </body>\\n" +\r\n'
+'         "</html>\\n";\r\n'
+'\r\n'
+'   frames[\'splitter\'].document.write(s.replace(/\\n$/,\'\'));\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'//\r\n'
+'// NULL SCORM API...\r\n'
+'//\r\n'
+'\r\n'
+'// SCORM 2004 API...\r\n'
+'\r\n'
+'var ADL_NAV_REQUEST = \'adl.nav.request\';\r\n'
+'\r\n'
+'var API_1484_11 = new Object();\r\n'
+'\r\n'
+'API_1484_11.Initialize       = function()              { return _Initialize(); }\r\n'
+'\r\n'
+'API_1484_11.Terminate        = function()              { return _Terminate(); }\r\n'
+'\r\n'
+'API_1484_11.GetValue         = function( name)         { return _GetValue(name); }\r\n'
+'\r\n'
+'API_1484_11.SetValue         = function( name, value)  { return _SetValue( name, value); }\r\n'
+'\r\n'
+'API_1484_11.Commit           = function()              { return _Commit();}\r\n'
+'\r\n'
+'API_1484_11.GetLastError     = function()              { return _GetLastError(); }\r\n'
+'\r\n'
+'API_1484_11.GetErrorString   = function( ErrorCodeNum) { return _GetErrorString( ErrorCodeNum ); }\r\n'
+'\r\n'
+'API_1484_11.GetDiagnostic    = function( ErrorCodeNum) { return _GetDiagnostic( ErrorCodeNum); }\r\n'
+'\r\n'
+'\r\n'
+'// SCORM 1.2.7 API...\r\n'
+'\r\n'
+'var API = new Object();\r\n'
+'\r\n'
+'API.LMSInitialize            = function()              { return _Initialize(); }\r\n'
+'\r\n'
+'API.LMSFinish                = function()              { return _Terminate(); }\r\n'
+'\r\n'
+'API.LMSGetValue              = function( name)         { return _GetValue(name); }\r\n'
+'\r\n'
+'API.LMSSetValue              = function( name, value)  { return _SetValue( name, value); }\r\n'
+'\r\n'
+'API.LMSCommit                = function()              { return _Commit(); }\r\n'
+'\r\n'
+'API.LMSGetLastError          = function()              { return _GetLastError(); }\r\n'
+'\r\n'
+'API.LMSGetErrorString        = function( ErrorCodeNum) { return _GetErrorString( ErrorCodeNum ); }\r\n'
+'\r\n'
+'API.LMSGetDiagnostic         = function( ErrorCodeNum) { return _GetDiagnostic( ErrorCodeNum); }\r\n'
+'\r\n'
+'\r\n'
+'// Common Null API -- do what you want here to simulate the LMS behavior!\r\n'
+'\r\n'
+'function _Initialize()                 { return true; }\r\n'
+'\r\n'
+'function _Terminate() \r\n'
+'{\r\n'
+'   if (lmsNavigated == true)\r\n'
+'   {\r\n'
+'      nextDirection = \'\';\r\n'
+'      lmsNavigated = false;\r\n'
+'   }\r\n'
+'\r\n'
+'   frames[\'content\'].location.href = \'javascript:"<body bgcolor=\' + backgroundColor + \'>"\'; \r\n'
+'   //alert(currentICU + "\\n\\n" + nextDirection);\r\n'
+'   NavigateToNextICU();\r\n'
+'   return true; \r\n'
+'}\r\n'
+'\r\n'
+'function _GetValue(name)               { return \'\'; }\r\n'
+'\r\n'
+'function _SetValue(name, value)\r\n'
+'{\r\n'
+'   if (name == ADL_NAV_REQUEST)\r\n'
+'      nextDirection = value;\r\n'
+'\r\n'
+'   return true; \r\n'
+'}\r\n'
+'\r\n'
+'function _Commit()                     { return true; }\r\n'
+'\r\n'
+'function _GetLastError()               { return \'\'; }\r\n'
+'\r\n'
+'function _GetErrorString(ErrorCodeNum) { return \'\'; }\r\n'
+'\r\n'
+'function _GetDiagnostic(ErrorCodeNum)  { return \'\'; }\r\n'
+'\r\n'
+'\r\n'
+'//\r\n'
+'// Read the SCORM manifest to get the launch data...\r\n'
+'//\r\n'
+'\r\n'
+'function GetLaunchDataFromSCORMMainifest(path)\r\n'
+'{\r\n'
+'   path = (path) ? path : \'\';\r\n'
+'\r\n'
+'   var out = new Object();\r\n'
+'\r\n'
+'   out.title = \'\';\r\n'
+'   out.path  = path;\r\n'
+'   out.sco   = new Array();\r\n'
+'\r\n'
+'   try \r\n'
+'   {\r\n'
+'      var xml = new ActiveXObject(\'MSXML.DOMDocument\');\r\n'
+'\r\n'
+'      xml.async = false;\r\n'
+'      xml.resolveExternals = false;\r\n'
+'      xml.load( path + \'imsmanifest.xml\');\r\n'
+'\r\n'
+'      out.title = xml.selectSingleNode(\'/manifest/organizations/organization/title\').text;\r\n'
+'\r\n'
+'      document.title = out.title;\r\n'
+'\r\n'
+'      var nodes = xml.selectNodes(\'//item\');\r\n'
+'\r\n'
+'      var nextItem = 0;\r\n'
+'\r\n'
+'      for (var i = 0; i < nodes.length; i++)\r\n'
+'      {\r\n'
+'         var title = nodes[i].selectSingleNode(\'title\').text;\r\n'
+'\r\n'
+'         var id    = nodes[i].getAttribute(\'identifier\');\r\n'
+'\r\n'
+'         var rnode = xml.selectSingleNode(\'//resource[@identifier=\\\'\' + id + \'\\\']\');\r\n'
+'\r\n'
+'         if (rnode == null)\r\n'
+'         {\r\n'
+'            id = nodes[i].getAttribute(\'identifierref\');\r\n'
+'\r\n'
+'            rnode = xml.selectSingleNode(\'//resource[@identifier=\\\'\' + id + \'\\\']\');\r\n'
+'         }\r\n'
+'\r\n'
+'         if (rnode == null)\r\n'
+'            continue;\r\n'
+'\r\n'
+'         out.sco[nextItem] = new Object();\r\n'
+'\r\n'
+'         out.sco[nextItem].id    = id;\r\n'
+'         out.sco[nextItem].title = title;\r\n'
+'         out.sco[nextItem].href  = rnode.getAttribute(\'href\');\r\n'
+'\r\n'
+'         nextItem++;\r\n'
+'      }\r\n'
+'   }\r\n'
+'   catch (e) {}\r\n'
+'\r\n'
+'   return out;\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function NavigateToNextICU()\r\n'
+'{\r\n'
+'   try\r\n'
+'   {\r\n'
+'      var i   = 0;\r\n'
+'      var icu = undefined;\r\n'
+'\r\n'
+'      for (; i < manif.sco.length; i++)\r\n'
+'      {\r\n'
+'         if (\'f_\' + manif.sco[i].id == currentICU)\r\n'
+'            break;\r\n'
+'      }\r\n'
+'\r\n'
+'      var fallback = manif.sco[0];\r\n'
+'\r\n'
+'      switch (nextDirection)\r\n'
+'      {\r\n'
+'         case \'continue\': i++;   break;\r\n'
+'         case \'previous\': i--;   break;\r\n'
+'         default:         i = i; break;\r\n'
+'      }\r\n'
+'\r\n'
+'      icu = manif.sco[i];\r\n'
+'\r\n'
+'      if (icu == undefined)\r\n'
+'      {\r\n'
+'         i   = 0;\r\n'
+'         icu = fallback;\r\n'
+'      }\r\n'
+'\r\n'
+'      if (icu != undefined)\r\n'
+'      {\r\n'
+'//         alert(\'Navigate to: \' + icu.id);\r\n'
+'\r\n'
+'         currentICU = "f_" + icu.id;\r\n'
+'         content.name = "content";\r\n'
+'\r\n'
+'         var href  = icu.href.replace(/\\\\/g,\'/\') + "?SCORMNAV=FLOW";\r\n'
+'\r\n'
+'         open(href,"content","");\r\n'
+'      }\r\n'
+'//      else\r\n'
+'//         alert(\'Cannot navigate!\');\r\n'
+'\r\n'
+'      LightupSelectedIC(i);\r\n'
+'   }\r\n'
+'   catch (e) {}\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'function LightupSelectedIC( index )\r\n'
+'{\r\n'
+'   var tds = frames[\'nav\'].document.getElementsByTagName(\'TD\');\r\n'
+'\r\n'
+'   for (var i = 0; i < tds.length; i++)\r\n'
+'   {\r\n'
+'      if (tds[i].id == \'aChoice\')\r\n'
+'         tds[i].className = \'lo\';\r\n'
+'\r\n'
+'      tds[i].setAttribute(\'unselectable\',\'on\');\r\n'
+'   }\r\n'
+'\r\n'
+'\r\n'
+'   try\r\n'
+'   {\r\n'
+'      frames[\'nav\'].document.body.all.aChoice[index].className = \'act\'\r\n'
+'   }\r\n'
+'   catch (e)\r\n'
+'   {\r\n'
+'      frames[\'nav\'].document.body.all.aChoice.className = \'act\'\r\n'
+'   }\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function FixFrameset()\r\n'
+'{\r\n'
+'   master.borderColor = backgroundColor;\r\n'
+'\r\n'
+'   if (openedNow == true)\r\n'
+'      FlyNavOpen();\r\n'
+'   else\r\n'
+'      frames[\'nav\'].document.getElementById(\'navTable\').style.display=\'block\';   \r\n'
+'\r\n'
+'   splitter.defaultOpenWidth = (splitWidth == 0 ? 200 : splitWidth);\r\n'
+'\r\n'
+'   splitter.opened  = openedNow;\r\n'
+'   splitter.state   = !openedNow;\r\n'
+'   splitter.bgColor = color;\r\n'
+'   splitter.fgColor = backgroundColor;\r\n'
+'\r\n'
+'   splitter.Initialize();\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'function FlyNavOpen()\r\n'
+'{\r\n'
+'   if (flyEffect)\r\n'
+'   {\r\n'
+'      var width = 1 * String(master.cols).split(\',\')[0];\r\n'
+'\r\n'
+'      if ( width < splitWidth )\r\n'
+'      {\r\n'
+'         master.cols = (width+10) + ",7,*";\r\n'
+'         setTimeout(FlyNavOpen, effectStepDelay);\r\n'
+'      }\r\n'
+'      else\r\n'
+'      {\r\n'
+'         frames[\'nav\'].document.getElementById(\'navTable\').style.display=\'block\';   \r\n'
+'      }\r\n'
+'   }\r\n'
+'   else\r\n'
+'   {\r\n'
+'      master.cols = splitWidth + ",7,*";\r\n'
+'      frames[\'nav\'].document.getElementById(\'navTable\').style.display=\'block\';   \r\n'
+'   }\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'function MakeUnselectable()\r\n'
+'{\r\n'
+'   MakeUnselectable_(frames[\'nav\']);\r\n'
+'   MakeUnselectable_(frames[\'splitter\']);\r\n'
+'}\r\n'
+'\r\n'
+'function MakeUnselectable_(win)\r\n'
+'{\r\n'
+'   var doc = win.document;\r\n'
+'\r\n'
+'   var all = doc.body.all;\r\n'
+'\r\n'
+'   for (var i = 0; i < all.length; ++i)\r\n'
+'   {\r\n'
+'      all[i].setAttribute(\'unselectable\', \'on\');\r\n'
+'   }\r\n'
+'\r\n'
+'   doc.body.setAttribute(\'unselectable\', \'on\');\r\n'
+'   doc.body.style.cursor = \'default\';\r\n'
+'}\r\n'
+'\r\n'
+'\r\n'
+'// LAUNCH!!!!\r\n'
+'\r\n'
+'setTimeout(writeNav,         1);\r\n'
+'setTimeout(writeSplitter,    1);\r\n'
+'setTimeout(MakeUnselectable, 5);\r\n'
+'\r\n'
+'setTimeout(FixFrameset, effectStartDelay);\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'\r\n'
+'</script>\r\n'
+'\r\n'
+'\r\n'
+'<html>\r\n'
+'  <head>\r\n'
+'    <title>Pico LMS</title>\r\n'
+'  </head>\r\n'
+'  <frameset name="master"  id="master" cols="0,7,*" frameborder="no" framespacing="0" border="0">\r\n'
+'    <frame name="nav"      id="nav"      src=\'javascript:"<body bgcolor=black>"\'  unselectable="on" scrolling="auto" noresize>\r\n'
+'    <frame name="splitter" id="splitter" frameborder="no" scrolling="no" unselectable="on" >\r\n'
+'    <frame name="content"  id="content"  src=\'javascript:"<body bgcolor=black>"\'  unselectable="on" scrolling="auto">\r\n'
+'  </frameset>\r\n'
+'\r\n'
+'</html>'
  , function (e) { if(e){return err(e)} chain[step++]() });

});



chain.push(function createHTML3 () {
  fs.writeFile( path.resolve(tmp, 'Interfaces', 'empty_C3_interface', 'C3interface.html'),
  '' // empty file
  , function (e) { if(e){return err(e)} chain[step++]() });

});



chain.push(function createHTML4 () {
  fs.writeFile( path.resolve(tmp, 'ICU_' + contentUuid, 'Media', 'interface.html'),
 '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\r\n'
+'<html xmlns="http://www.w3.org/1999/xhtml">\r\n'
+'<head>\r\n'
+'<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />\r\n'
+'<title>Schneider</title>\r\n'
+'<style type="text/css">\r\n'
+'<!--\r\n'
+'body {\r\n'
+'\tmargin-left: 0px;\r\n'
+'\tmargin-top: 0px;\r\n'
+'\tmargin-right: 0px;\r\n'
+'\tmargin-bottom: 0px;\r\n'
+'\tbackground-color: #000000;\r\n'
+'\tcolor: #333333;\r\n'
+'}\r\n'
+'body,td,th {\r\n'
+'\tfont-family: Arial, Helvetica, sans-serif;\r\n'
+'}\r\n'
+'-->\r\n'
+'</style></head>\r\n'
+'<body onload="Loading()" onbeforeunload="SCO_ExitICU()" onresize="Size_Table()">\r\n'
+'<div style="position: absolute; left: 0px; top: 0px; width: 8px; height: 8px; z-index: 1; cursor: pointer; background-color: #222222;" onclick="Make_Scalable()" ondblclick="Show_Bookmark()">&nbsp;&nbsp;</div>\r\n'
+'<table id="MAIN" align="center" cellpadding="0" cellspacing="0" border="0" style="visibility: hidden"><tr><td width="784" height="389" align="center" valign="middle" id="maincontent">Loading...</td></tr></table>\r\n'
+'<div id="output" style="display: none; font-size:12px; position: absolute; z-index: 2; left: 10px; top: 0px; color:#333333"></div>\r\n'
+'</body>\r\n'
+'</html>\r\n'
+'<script src="All_Functions_1_2.js" type="text/javascript"></script>\r\n'
+'<script language="javascript">\r\n'
+'  var bookMarks = "currentFrame=1&highestFrame=1";\r\n'
+'  function Loading(){\r\n'
+'    Size_Table();\r\n'
+'    document.getElementById("MAIN").style.visibility = "visible";\r\n'
+'    SCO_LoadICU();\r\n'
+'\tsetTimeout("GetBookmarks()",1000);  \r\n'
+'  }\r\n'
+'  function GetBookmarks() {\r\n'
+'    var api = getAPIHandle();\r\n'
+'    if (api != null){\r\n'
+'\t  var BookMarks = SCO_GetBookmarkLocation();\r\n'
+'\t  if(BookMarks.indexOf(\'currentFrame\') != - 1)\r\n'
+'\t    bookMarks = BookMarks;\t  \r\n'
+'\t  bookMarks += "&api=1";\r\n'
+'\t  bookMarks += "&completed=" + doGetValue( CMI_COMPLETION_STATUS );  \r\n'
+'\t}\r\n'
+'    document.getElementById("output").innerHTML = bookMarks;\t\r\n'
+'\tdocument.getElementById("maincontent").innerHTML = \'<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" codebase="http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=9,0,0,0" width="100%" height="100%" align="middle" id="interface"> <param name="allowScriptAccess" value="always" /> <param name="movie" value="interface.swf" /> <param name="quality" value="high" /> <param name="bgcolor" value="#000000" /> <param name="FlashVars" value="\' + bookMarks + \'" /> <embed src="interface.swf" width="100%" height="100%" autostart="false" quality="high" bgcolor="#000000" FlashVars="\' + bookMarks + \'" name="interface" align="middle" allowScriptAccess="always" type="application/x-shockwave-flash" pluginspage="http://www.macromedia.com/go/getflashplayer" /> </object>\'; \r\n'
+'  }\r\n'
+'  function Size_Table() {\r\n'
+'    var H = 389;\r\n'
+'    if(navigator.appName.indexOf("Explorer") != -1) {\r\n'
+'\t  H = document.documentElement.clientHeight;\r\n'
+'    }\r\n'
+'    else {\r\n'
+'      H = window.innerHeight;\t  \r\n'
+'    }\t\r\n'
+'    document.getElementById("maincontent").style.height = H + "px";\r\n'
+'  }\r\n'
+'  function Make_Scalable(){ \r\n'
+'\tif(document.getElementById("maincontent").width.indexOf("784") != -1){\r\n'
+'\t  document.getElementById("MAIN").width = "99%";\r\n'
+'\t  document.getElementById("maincontent").width = "100%";\r\n'
+'\t}\r\n'
+'\telse{\r\n'
+'\t  document.getElementById("MAIN").width = "";\t\r\n'
+'\t  document.getElementById("maincontent").width = "784";\r\n'
+'\t}\r\n'
+'  }\r\n'
+'  function Show_Bookmark(){\r\n'
+'\tdocument.getElementById("output").style.display = "block";\t\r\n'
+'  }  \r\n'
+'  if(navigator.userAgent.indexOf("MSIE") == -1)\r\n'
+'    window.onbeforeunload = C3UnloadLesson();  \r\n'
+'</script>'
  , function (e) { if(e){return err(e)} chain[step++]() });

});



chain.push(function createDynamic1 () {
  var aggregationUuid = generateUuid();
  var out =  '<?xml version="1.0" encoding="utf-8"?>\r\n'
+'<manifest identifier="identifier" version="1.0" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd ">\r\n'
+'  <metadata>\r\n'
+'    <schema>ADL SCORM</schema>\r\n'
+'    <schemaversion>1.2</schemaversion>\r\n'
+'  </metadata>\r\n'
+'    <organizations default="C3Aggregation_' + aggregationUuid + '">\r\n'
+'    <organization identifier="C3Aggregation_' + aggregationUuid + '">\r\n'
+'      <title>' + courseTitle + '</title>\r\n'
+'      <item identifier="Item_0" identifierref="ICU_' + contentUuid + '" parameters="?SCORMNAV=FLOW&amp;FIRSTICU=TRUE">\r\n'
+'        <title>' + courseTitle + '</title>\r\n'
+'                      </item>\r\n'
+'          </organization>\r\n'
+'  </organizations>\r\n'
+'    <resources>\r\n'
+'    <resource identifier="OVERHEAD" type="webcontent" adlcp:scormtype="asset">\r\n'
+'      <file href="index.html" />\r\n'
+'      <file href="adlcp_rootv1p2.xsd" />\r\n'
+'      <file href="ims_xml.xsd" />\r\n'
+'      <file href="imscp_rootv1p1p2.xsd" />\r\n'
+'      <file href="imsmd_rootv1p2.xsd" />\r\n'
+'      <file href="imsmd_rootv1p2p1.xsd" />\r\n'
+'    </resource>\r\n'
+'    <resource identifier="INTERFACE_empty_C3_interface" type="webcontent" adlcp:scormtype="asset">\r\n'
+'      <file href="Interfaces/empty_C3_interface/C3interface.html" />\r\n'
+'      <file href="Interfaces/empty_C3_interface/interface.js" />\r\n'
+'      <!-- @todo why no Utils? -->\r\n'
+'    </resource>\r\n'
+'    <resource identifier="ICU_' + contentUuid + '" type="webcontent" adlcp:scormtype="sco" href="ICU_' + contentUuid + '/index.html?MODE=CAI">\r\n'
+'\r\n'
+'      <!-- Static -->\r\n'
+'      <file href="ICU_' + contentUuid + '/C3ICU.xml" />\r\n'
+'      <file href="ICU_' + contentUuid + '/index.html" />\r\n'
+'      <file href="ICU_' + contentUuid + '/Media/All_Functions_1_2.js" />\r\n'
+'      <file href="ICU_' + contentUuid + '/Media/interface.html" />\r\n'
+'      <file href="ICU_' + contentUuid + '/Media/welcome.png" />\r\n'
+'\r\n'
+'      <!-- Dynamic -->\r\n'
;

swfs.forEach( function (swf) {
  out += '      <file href="ICU_' + contentUuid + '/Media/' + swf + '" />\r\n';
});

uuids.forEach( function (uuid) {
  out += '      <file href="ICU_' + contentUuid + '/Data/' + uuid + '.xml" />\r\n';
});

  out += 
 '\r\n'
+'      <dependency identifierref="INTERFACE_empty_C3_interface" />\r\n'
+'      <dependency identifierref="OVERHEAD" />\r\n'
+'    </resource>\r\n'
+'  </resources>\r\n'
+'</manifest>'

  fs.writeFile( path.resolve(tmp, 'imsmanifest.xml'), out, function (e) { if(e){return err(e)} chain[step++]() });

});



chain.push(function createDynamic2 () {
  var out = ''
+'<ICU Identifier="' + contentUuid + '" Interface="empty_C3_interface" '
  +'PassingGrade="" AssessmentReporting="None" Title="1Q 2016 Sustainment" '
  +'UnvisitedFrames="" DevGroup="7475EF97-613A-4C52-A2B6-B3729E7E18C6" >\r\n'
+'\r\n'
+'  <Frames>\r\n'
+'\r\n'
+'    <!-- Static -->\r\n'
  out += '    <Frame Identifier="' + welcomePngUuid + '" Hidden="False" Graded="No" '
    +'Name="Welcome" Filename="' + welcomePngUuid + '.xml" DesignedBy="LST.dp464896" '
    +'DesignedAt="11/30/2015 9:49:21 AM" DesignedOn="ICECOMDEV01" '
    +'CompletionCriterion="" />\r\n'
+'\r\n'
+'    <!-- Dynamic -->\r\n'
;

uuids.forEach( function (uuid,i) {
  if ('interface.swf' == swfs[i]) return;
  var title = swfToTitle[ swfs[i] ];
  out += '    <Frame Identifier="' + uuid + '" Hidden="False" Graded="No" '
    +'Name="'+title+'" Filename="' + uuid + '.xml" DesignedBy="LST.dp464896" '
    +'DesignedAt="11/30/2015 9:49:21 AM" DesignedOn="ICECOMDEV01" '
    +'CompletionCriterion="" />\r\n'
});

  out += 
 '\r\n'
+'  </Frames>\r\n'
+'\r\n'
+'  <Assets>\r\n'
+'\r\n'
+'    <!-- Static -->\r\n'
+'    <Asset Type="js" Filename="All_Functions_1_2.js" />\r\n'
+'    <Asset Type="html" Filename="interface.html" />\r\n'
+'    <Asset Type="png" Filename="welcome.png" />\r\n'
+'\r\n'
+'    <!-- Dynamic -->\r\n'
;

swfs.forEach( function (swf) {
  out += '    <Asset Type="swf" Filename="' + swf + '" />\r\n'
});

  out += 
 '\r\n'
+'  </Assets>\r\n'
+'\r\n'
+'  <MediaPresentation X="" Y="" Height="" Width="" Knobs="" VerticalKnobs="" AudioOnly="" Border="" AskUser="" DisplayInSeparateWindow="" />\r\n'
+'</ICU>\r\n'

  fs.writeFile( path.resolve(tmp, 'ICU_' + contentUuid, 'C3ICU.xml'), out, function (e) { if(e){return err(e)} chain[step++]() });

});


//// Generate all ‘Data’ XMLs except for ‘welcome.png’. 
chain.push(function createDataXMLs () {
  var createTally = 1; // `1` not `0`, because ‘interface.swf’ does not need a frame
  uuids.forEach( function (uuid,i) {
    if ('interface.swf' == swfs[i]) return;
    var title = swfToTitle[ swfs[i] ];
    var out = 
 '<Frame xmlns:C3="http://www.dpatraining.com/C3Controls" Name="'+title+'" '
  +'Identifier="' + uuid +'" Hidden="False" BackgroundImage="" MediaClip="" >\r\n'
+'\r\n'
+'  <Head Display="none" ShowOnlyIf="" ShowOnlyIfNot="" >\r\n'
+'    <FrameText >\r\n'
+'TODO : Insert Frame Text Here    </FrameText>\r\n'
+'    <InstructionText >\r\n'
+'TODO : Insert Instruction Text Here    </InstructionText>\r\n'
+'    <Buttons >\r\n'
+'      <Button Name="BACK" State="Enabled" />\r\n'
+'      <Button Name="REFERENCE" State="Enabled" />\r\n'
+'      <Button Name="GLOSSARY" State="Enabled" />\r\n'
+'      <Button Name="MENU" State="Enabled" />\r\n'
+'      <Button Name="HELP" State="Enabled" />\r\n'
+'      <Button Name="MEDIA" State="Enabled" />\r\n'
+'      <Button Name="AUDIO" State="Enabled" />\r\n'
+'      <Button Name="EXIT" State="Enabled" />\r\n'
+'      <Button Name="NEXT" State="Enabled" />\r\n'
+'    </Buttons>\r\n'
+'  </Head>\r\n'
+'  <AddOns />\r\n'
+'  <Interactions Display="none" />\r\n'
+'  <Question Display="none" />\r\n'
+'  <References Display="none" >\r\n'
+'  </References>\r\n'
+'  <Content >\r\n'
+'    <C3:Media\r\n'
+'      accDescription=""\r\n'
+'      accKey=""\r\n'
+'      asset="' + swfs[i] + '"\r\n'
+'      class="C3MediaControl"\r\n'
+'      clickToFrame=""\r\n'
+'      clickToLink=""\r\n'
+'      docWriterDocId=""\r\n'
+'      docWriterId=""\r\n'
+'      docWriterRefreshable="False"\r\n'
+'      height="360px"\r\n'
+'      id="MEDIA_1"\r\n'
+'      knobs="False"\r\n'
+'      Left="0px"\r\n'
+'      locked="False"\r\n'
+'      lookLikeAButton="False"\r\n'
+'      mime="application/x-shockwave-flash"\r\n'
+'      mouseoverToFrame=""\r\n'
+'      runtimeAutoplay="True"\r\n'
+'      runtimeLoop="False"\r\n'
+'      runtimeName=""\r\n'
+'      shape="None"\r\n'
+'      smartGraphic=""\r\n'
+'      style="OVERFLOW: hidden; CURSOR: default; HEIGHT: 360px; WIDTH: 784px; '
  +'POSITION: absolute; LEFT: 0px; Z-INDEX: 1; TOP: 0px; BEHAVIOR: url(); '
  +'VISIBILITY: visible; BACKGROUND-COLOR: transparent"\r\n'
+'      template="C3:Media"\r\n'
+'      Top="0px"\r\n'
+'      whenClicked="False"\r\n'
+'      whenMouseDown="False"\r\n'
+'      whenMouseOut="False"\r\n'
+'      whenMouseOver="False"\r\n'
+'      whenMouseUp="False"\r\n'
+'      width="784px"\r\n'
+'      zIndex="1"\r\n'
+'      xmlns:C3="http://www.dpatraining.com/C3Controls"\r\n'
+'    ><C3:MediaText><![CDATA[<DIV>Design view<BR>FLASH Media: MEDIA_1<BR>'
  +'Asset: ' + swfs[i] + '</DIV>]]></C3:MediaText></C3:Media>\r\n'
+'          </Content>\r\n'
+'</Frame>\r\n'
+'\r\n'
    ;
    fs.writeFile(
        path.resolve(tmp, 'ICU_' + contentUuid, 'Data', uuid + '.xml')
      , out
      , function (e) {
          if (e) return err(e);
          if (++createTally == uuids.length) chain[step++]();
        }
    );
  });
});


//// Generate special XML for ‘welcome.png’. 
chain.push(function createWelcomeDataXML () {
  var out = 
 '<Frame xmlns:C3="http://www.dpatraining.com/C3Controls" Name="Welcome" '
  +'Identifier="' + welcomePngUuid +'" Hidden="False" BackgroundImage="" MediaClip="" >\r\n'
+'\r\n'
+'  <Head Display="none" ShowOnlyIf="" ShowOnlyIfNot="" >\r\n'
+'    <FrameText >\r\n'
+'TODO : Insert Frame Text Here    </FrameText>\r\n'
+'    <InstructionText >\r\n'
+'TODO : Insert Instruction Text Here    </InstructionText>\r\n'
+'    <Buttons >\r\n'
+'      <Button Name="BACK" State="Enabled" />\r\n'
+'      <Button Name="REFERENCE" State="Enabled" />\r\n'
+'      <Button Name="GLOSSARY" State="Enabled" />\r\n'
+'      <Button Name="MENU" State="Enabled" />\r\n'
+'      <Button Name="HELP" State="Enabled" />\r\n'
+'      <Button Name="MEDIA" State="Enabled" />\r\n'
+'      <Button Name="AUDIO" State="Enabled" />\r\n'
+'      <Button Name="EXIT" State="Enabled" />\r\n'
+'      <Button Name="NEXT" State="Enabled" />\r\n'
+'    </Buttons>\r\n'
+'  </Head>\r\n'
+'  <AddOns />\r\n'
+'  <Interactions Display="none" />\r\n'
+'  <Question Display="none" />\r\n'
+'  <References Display="none" >\r\n'
+'  </References>\r\n'
+'  <Content >\r\n'
+'    <C3:Media\r\n'
+'      accDescription=""\r\n'
+'      accKey=""\r\n'
+'      asset="welcome.png"\r\n'
+'      class="C3MediaControl"\r\n'
+'      clickToFrame=""\r\n'
+'      clickToLink=""\r\n'
+'      docWriterDocId=""\r\n'
+'      docWriterId=""\r\n'
+'      docWriterRefreshable="False"\r\n'
+'      height="360px"\r\n'
+'      id="MEDIA_1"\r\n'
+'      knobs="False"\r\n'
+'      Left="0px"\r\n'
+'      locked="False"\r\n'
+'      lookLikeAButton="False"\r\n'
+'      mime="image/png"\r\n'
+'      mouseoverToFrame=""\r\n'
+'      runtimeAutoplay="True"\r\n'
+'      runtimeLoop="False"\r\n'
+'      runtimeName=""\r\n'
+'      shape="None"\r\n'
+'      smartGraphic=""\r\n'
+'      style="OVERFLOW: hidden; CURSOR: default; HEIGHT: 360px; WIDTH: 784px; '
  +'POSITION: absolute; LEFT: 0px; Z-INDEX: 1; TOP: 0px; BEHAVIOR: url(); '
  +'VISIBILITY: visible; BACKGROUND-COLOR: transparent"\r\n'
+'      template="C3:Media"\r\n'
+'      Top="0px"\r\n'
+'      whenClicked="False"\r\n'
+'      whenMouseDown="False"\r\n'
+'      whenMouseOut="False"\r\n'
+'      whenMouseOver="False"\r\n'
+'      whenMouseUp="False"\r\n'
+'      width="784px"\r\n'
+'      zIndex="1"\r\n'
+'      xmlns:C3="http://www.dpatraining.com/C3Controls"\r\n'
+'    ><C3:MediaText><![CDATA[]]></C3:MediaText></C3:Media>\r\n'
+'          </Content>\r\n'
+'</Frame>\r\n'
+'\r\n'
;
  fs.writeFile(
      path.resolve(tmp, 'ICU_' + contentUuid, 'Data', welcomePngUuid + '.xml')
    , out
    , function (e) {
        if (e) return err(e);
        chain[step++]();
      }
  );
});


//// Copy welcome.png to ‘Media’. 
chain.push(function copyWelcomePng () {
  copyFile(
      path.resolve(__dirname, '..', 'SWFs', 'welcome.png')
    , path.resolve(tmp, 'ICU_' + contentUuid, 'Media', 'welcome.png')
    , function (e) {
        if (e) return err(e);
        chain[step++]();
      }
  );
});


//// Copy swfs to ‘Media’. 
chain.push(function copySwfs () {
  var copyTally = 0;
  swfs.forEach( function (swf) {
    copyFile(
        path.resolve(__dirname, '..', 'SWFs', swf)
      , path.resolve(tmp, 'ICU_' + contentUuid, 'Media', swf)
      , function (e) {
          if (e) return err(e);
          if (++copyTally == swfs.length) chain[step++]();
        }
    );
  });
});


// chain.push(function convertToZip () {
//   var inp = fs.createReadStream('input.txt')
//     , out = fs.createWriteStream('input.txt.gz');

//   inp.pipe(gzip).pipe(out);
//   chain[step++]();

// });



chain.push(function clearSCORMPackage () {
  rmrf(SCORMPackagePath);
  fs.mkdir(SCORMPackagePath, chain[step++]);
});



chain.push(function moveTmpDirToSCORMPackage () {
  fs.rename(
      tmp
    , path.resolve(__dirname, '..', 'SCORM Package', courseSlug + '_' + timeStamp)
    , function (e) {
        if(e) { return err(e); }
        chain[step++]();
      }
  );
});



chain.push(function zipSCORMContent () {
  ziplocal.zip(SCORMContentPath, function(zipped) {
      zipped.compress(); // compress before exporting 
      zipped.save(SCORMContentPath + '.zip', chain[step++]); // save the zipped file to disk 
  });
});

chain.push(function tarGzSCORMContent () {
  var reader = fstream.Reader({
      path: SCORMContentPath
    , type: 'Directory'
  })

  var writer = fstream.Writer({
      path: SCORMContentPath + '.tar.gz'
  })

  var stream =
      reader
    . pipe( tar.Pack() )   // convert the directory to a .tar file
    . pipe( zlib.Gzip() )  // compress the .tar file
    . pipe( writer ) // write to the destination file
  ;
  reader.on('error', err);
  writer.on('error', err);
  writer.on('close', chain[step++]);
});



chain.push(function deleteZeroByteZip () {
  var stats = fs.statSync(SCORMContentPath + '.zip');
  zipSize = stats.size;
  if (! zipSize) {
    fs.unlinkSync(SCORMContentPath + '.zip');
  } else {
    chain[step++]();
  }
});



chain.push(function deleteZeroByteTarGz () {
  var stats = fs.statSync(SCORMContentPath + '.tar.gz');
  tarGzSize = stats.size;
  if (! tarGzSize) {
    fs.unlinkSync(SCORMContentPath + '.tar.gz');
  } else {
    chain[step++]();
  }
});



chain.push(function displayZipSize () {
  var color = 2000000 < zipSize ? '\033[31m' : '';
  log('.zip size:    ' + color + (zipSize / 1000000.0) + ' MB\033[0m');
  chain[step++]();
});



chain.push(function displayTarGzSize () {
  var color = 2000000 < tarGzSize ? '\033[31m' : '';
  log('.tar.gz size: ' + color + (tarGzSize / 1000000.0) + ' MB\033[0m');
  chain[step++]();
});



chain.push(function () {}); // end




//// Start running the chain. 
chain[step++]();



}( // end the main closure, and begin the bundled NPM modules






















/*fstream*/ (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
exports.Abstract = require('./lib/abstract.js')
exports.Reader = require('./lib/reader.js')
exports.Writer = require('./lib/writer.js')

exports.File = {
  Reader: require('./lib/file-reader.js'),
  Writer: require('./lib/file-writer.js')
}

exports.Dir = {
  Reader: require('./lib/dir-reader.js'),
  Writer: require('./lib/dir-writer.js')
}

exports.Link = {
  Reader: require('./lib/link-reader.js'),
  Writer: require('./lib/link-writer.js')
}

exports.Proxy = {
  Reader: require('./lib/proxy-reader.js'),
  Writer: require('./lib/proxy-writer.js')
}

exports.Reader.Dir = exports.DirReader = exports.Dir.Reader
exports.Reader.File = exports.FileReader = exports.File.Reader
exports.Reader.Link = exports.LinkReader = exports.Link.Reader
exports.Reader.Proxy = exports.ProxyReader = exports.Proxy.Reader

exports.Writer.Dir = exports.DirWriter = exports.Dir.Writer
exports.Writer.File = exports.FileWriter = exports.File.Writer
exports.Writer.Link = exports.LinkWriter = exports.Link.Writer
exports.Writer.Proxy = exports.ProxyWriter = exports.Proxy.Writer

exports.collect = require('./lib/collect.js')

},{"./lib/abstract.js":2,"./lib/collect.js":3,"./lib/dir-reader.js":4,"./lib/dir-writer.js":5,"./lib/file-reader.js":6,"./lib/file-writer.js":7,"./lib/link-reader.js":9,"./lib/link-writer.js":10,"./lib/proxy-reader.js":11,"./lib/proxy-writer.js":12,"./lib/reader.js":13,"./lib/writer.js":15}],2:[function(require,module,exports){
// the parent class for all fstreams.

module.exports = Abstract

var Stream = require('stream').Stream
var inherits = require('inherits')

function Abstract () {
  Stream.call(this)
}

inherits(Abstract, Stream)

Abstract.prototype.on = function (ev, fn) {
  if (ev === 'ready' && this.ready) {
    process.nextTick(fn.bind(this))
  } else {
    Stream.prototype.on.call(this, ev, fn)
  }
  return this
}

Abstract.prototype.abort = function () {
  this._aborted = true
  this.emit('abort')
}

Abstract.prototype.destroy = function () {}

Abstract.prototype.warn = function (msg, code) {
  var self = this
  var er = decorate(msg, code, self)
  if (!self.listeners('warn')) {
    console.error('%s %s\n' +
    'path = %s\n' +
    'syscall = %s\n' +
    'fstream_type = %s\n' +
    'fstream_path = %s\n' +
    'fstream_unc_path = %s\n' +
    'fstream_class = %s\n' +
    'fstream_stack =\n%s\n',
      code || 'UNKNOWN',
      er.stack,
      er.path,
      er.syscall,
      er.fstream_type,
      er.fstream_path,
      er.fstream_unc_path,
      er.fstream_class,
      er.fstream_stack.join('\n'))
  } else {
    self.emit('warn', er)
  }
}

Abstract.prototype.info = function (msg, code) {
  this.emit('info', msg, code)
}

Abstract.prototype.error = function (msg, code, th) {
  var er = decorate(msg, code, this)
  if (th) throw er
  else this.emit('error', er)
}

function decorate (er, code, self) {
  if (!(er instanceof Error)) er = new Error(er)
  er.code = er.code || code
  er.path = er.path || self.path
  er.fstream_type = er.fstream_type || self.type
  er.fstream_path = er.fstream_path || self.path
  if (self._path !== self.path) {
    er.fstream_unc_path = er.fstream_unc_path || self._path
  }
  if (self.linkpath) {
    er.fstream_linkpath = er.fstream_linkpath || self.linkpath
  }
  er.fstream_class = er.fstream_class || self.constructor.name
  er.fstream_stack = er.fstream_stack ||
    new Error().stack.split(/\n/).slice(3).map(function (s) {
      return s.replace(/^ {4}at /, '')
    })

  return er
}

},{"inherits":20,"stream":undefined}],3:[function(require,module,exports){
module.exports = collect

function collect (stream) {
  if (stream._collected) return

  stream._collected = true
  stream.pause()

  stream.on('data', save)
  stream.on('end', save)
  var buf = []
  function save (b) {
    if (typeof b === 'string') b = new Buffer(b)
    if (Buffer.isBuffer(b) && !b.length) return
    buf.push(b)
  }

  stream.on('entry', saveEntry)
  var entryBuffer = []
  function saveEntry (e) {
    collect(e)
    entryBuffer.push(e)
  }

  stream.on('proxy', proxyPause)
  function proxyPause (p) {
    p.pause()
  }

  // replace the pipe method with a new version that will
  // unlock the buffered stuff.  if you just call .pipe()
  // without a destination, then it'll re-play the events.
  stream.pipe = (function (orig) {
    return function (dest) {
      // console.error(' === open the pipes', dest && dest.path)

      // let the entries flow through one at a time.
      // Once they're all done, then we can resume completely.
      var e = 0
      ;(function unblockEntry () {
        var entry = entryBuffer[e++]
        // console.error(" ==== unblock entry", entry && entry.path)
        if (!entry) return resume()
        entry.on('end', unblockEntry)
        if (dest) dest.add(entry)
        else stream.emit('entry', entry)
      })()

      function resume () {
        stream.removeListener('entry', saveEntry)
        stream.removeListener('data', save)
        stream.removeListener('end', save)

        stream.pipe = orig
        if (dest) stream.pipe(dest)

        buf.forEach(function (b) {
          if (b) stream.emit('data', b)
          else stream.emit('end')
        })

        stream.resume()
      }

      return dest
    }
  })(stream.pipe)
}

},{}],4:[function(require,module,exports){
// A thing that emits "entry" events with Reader objects
// Pausing it causes it to stop emitting entry events, and also
// pauses the current entry if there is one.

module.exports = DirReader

var fs = require('graceful-fs')
var inherits = require('inherits')
var path = require('path')
var Reader = require('./reader.js')
var assert = require('assert').ok

inherits(DirReader, Reader)

function DirReader (props) {
  var self = this
  if (!(self instanceof DirReader)) {
    throw new Error('DirReader must be called as constructor.')
  }

  // should already be established as a Directory type
  if (props.type !== 'Directory' || !props.Directory) {
    throw new Error('Non-directory type ' + props.type)
  }

  self.entries = null
  self._index = -1
  self._paused = false
  self._length = -1

  if (props.sort) {
    this.sort = props.sort
  }

  Reader.call(this, props)
}

DirReader.prototype._getEntries = function () {
  var self = this

  // race condition.  might pause() before calling _getEntries,
  // and then resume, and try to get them a second time.
  if (self._gotEntries) return
  self._gotEntries = true

  fs.readdir(self._path, function (er, entries) {
    if (er) return self.error(er)

    self.entries = entries

    self.emit('entries', entries)
    if (self._paused) self.once('resume', processEntries)
    else processEntries()

    function processEntries () {
      self._length = self.entries.length
      if (typeof self.sort === 'function') {
        self.entries = self.entries.sort(self.sort.bind(self))
      }
      self._read()
    }
  })
}

// start walking the dir, and emit an "entry" event for each one.
DirReader.prototype._read = function () {
  var self = this

  if (!self.entries) return self._getEntries()

  if (self._paused || self._currentEntry || self._aborted) {
    // console.error('DR paused=%j, current=%j, aborted=%j', self._paused, !!self._currentEntry, self._aborted)
    return
  }

  self._index++
  if (self._index >= self.entries.length) {
    if (!self._ended) {
      self._ended = true
      self.emit('end')
      self.emit('close')
    }
    return
  }

  // ok, handle this one, then.

  // save creating a proxy, by stat'ing the thing now.
  var p = path.resolve(self._path, self.entries[self._index])
  assert(p !== self._path)
  assert(self.entries[self._index])

  // set this to prevent trying to _read() again in the stat time.
  self._currentEntry = p
  fs[ self.props.follow ? 'stat' : 'lstat' ](p, function (er, stat) {
    if (er) return self.error(er)

    var who = self._proxy || self

    stat.path = p
    stat.basename = path.basename(p)
    stat.dirname = path.dirname(p)
    var childProps = self.getChildProps.call(who, stat)
    childProps.path = p
    childProps.basename = path.basename(p)
    childProps.dirname = path.dirname(p)

    var entry = Reader(childProps, stat)

    // console.error("DR Entry", p, stat.size)

    self._currentEntry = entry

    // "entry" events are for direct entries in a specific dir.
    // "child" events are for any and all children at all levels.
    // This nomenclature is not completely final.

    entry.on('pause', function (who) {
      if (!self._paused && !entry._disowned) {
        self.pause(who)
      }
    })

    entry.on('resume', function (who) {
      if (self._paused && !entry._disowned) {
        self.resume(who)
      }
    })

    entry.on('stat', function (props) {
      self.emit('_entryStat', entry, props)
      if (entry._aborted) return
      if (entry._paused) {
        entry.once('resume', function () {
          self.emit('entryStat', entry, props)
        })
      } else self.emit('entryStat', entry, props)
    })

    entry.on('ready', function EMITCHILD () {
      // console.error("DR emit child", entry._path)
      if (self._paused) {
        // console.error("  DR emit child - try again later")
        // pause the child, and emit the "entry" event once we drain.
        // console.error("DR pausing child entry")
        entry.pause(self)
        return self.once('resume', EMITCHILD)
      }

      // skip over sockets.  they can't be piped around properly,
      // so there's really no sense even acknowledging them.
      // if someone really wants to see them, they can listen to
      // the "socket" events.
      if (entry.type === 'Socket') {
        self.emit('socket', entry)
      } else {
        self.emitEntry(entry)
      }
    })

    var ended = false
    entry.on('close', onend)
    entry.on('disown', onend)
    function onend () {
      if (ended) return
      ended = true
      self.emit('childEnd', entry)
      self.emit('entryEnd', entry)
      self._currentEntry = null
      if (!self._paused) {
        self._read()
      }
    }

    // XXX Remove this.  Works in node as of 0.6.2 or so.
    // Long filenames should not break stuff.
    entry.on('error', function (er) {
      if (entry._swallowErrors) {
        self.warn(er)
        entry.emit('end')
        entry.emit('close')
      } else {
        self.emit('error', er)
      }
    })

    // proxy up some events.
    ;[
      'child',
      'childEnd',
      'warn'
    ].forEach(function (ev) {
      entry.on(ev, self.emit.bind(self, ev))
    })
  })
}

DirReader.prototype.disown = function (entry) {
  entry.emit('beforeDisown')
  entry._disowned = true
  entry.parent = entry.root = null
  if (entry === this._currentEntry) {
    this._currentEntry = null
  }
  entry.emit('disown')
}

DirReader.prototype.getChildProps = function () {
  return {
    depth: this.depth + 1,
    root: this.root || this,
    parent: this,
    follow: this.follow,
    filter: this.filter,
    sort: this.props.sort,
    hardlinks: this.props.hardlinks
  }
}

DirReader.prototype.pause = function (who) {
  var self = this
  if (self._paused) return
  who = who || self
  self._paused = true
  if (self._currentEntry && self._currentEntry.pause) {
    self._currentEntry.pause(who)
  }
  self.emit('pause', who)
}

DirReader.prototype.resume = function (who) {
  var self = this
  if (!self._paused) return
  who = who || self

  self._paused = false
  // console.error('DR Emit Resume', self._path)
  self.emit('resume', who)
  if (self._paused) {
    // console.error('DR Re-paused', self._path)
    return
  }

  if (self._currentEntry) {
    if (self._currentEntry.resume) self._currentEntry.resume(who)
  } else self._read()
}

DirReader.prototype.emitEntry = function (entry) {
  this.emit('entry', entry)
  this.emit('child', entry)
}

},{"./reader.js":13,"assert":undefined,"graceful-fs":17,"inherits":20,"path":undefined}],5:[function(require,module,exports){
// It is expected that, when .add() returns false, the consumer
// of the DirWriter will pause until a "drain" event occurs. Note
// that this is *almost always going to be the case*, unless the
// thing being written is some sort of unsupported type, and thus
// skipped over.

module.exports = DirWriter

var Writer = require('./writer.js')
var inherits = require('inherits')
var mkdir = require('mkdirp')
var path = require('path')
var collect = require('./collect.js')

inherits(DirWriter, Writer)

function DirWriter (props) {
  var self = this
  if (!(self instanceof DirWriter)) {
    self.error('DirWriter must be called as constructor.', null, true)
  }

  // should already be established as a Directory type
  if (props.type !== 'Directory' || !props.Directory) {
    self.error('Non-directory type ' + props.type + ' ' +
      JSON.stringify(props), null, true)
  }

  Writer.call(this, props)
}

DirWriter.prototype._create = function () {
  var self = this
  mkdir(self._path, Writer.dirmode, function (er) {
    if (er) return self.error(er)
    // ready to start getting entries!
    self.ready = true
    self.emit('ready')
    self._process()
  })
}

// a DirWriter has an add(entry) method, but its .write() doesn't
// do anything.  Why a no-op rather than a throw?  Because this
// leaves open the door for writing directory metadata for
// gnu/solaris style dumpdirs.
DirWriter.prototype.write = function () {
  return true
}

DirWriter.prototype.end = function () {
  this._ended = true
  this._process()
}

DirWriter.prototype.add = function (entry) {
  var self = this

  // console.error('\tadd', entry._path, '->', self._path)
  collect(entry)
  if (!self.ready || self._currentEntry) {
    self._buffer.push(entry)
    return false
  }

  // create a new writer, and pipe the incoming entry into it.
  if (self._ended) {
    return self.error('add after end')
  }

  self._buffer.push(entry)
  self._process()

  return this._buffer.length === 0
}

DirWriter.prototype._process = function () {
  var self = this

  // console.error('DW Process p=%j', self._processing, self.basename)

  if (self._processing) return

  var entry = self._buffer.shift()
  if (!entry) {
    // console.error("DW Drain")
    self.emit('drain')
    if (self._ended) self._finish()
    return
  }

  self._processing = true
  // console.error("DW Entry", entry._path)

  self.emit('entry', entry)

  // ok, add this entry
  //
  // don't allow recursive copying
  var p = entry
  var pp
  do {
    pp = p._path || p.path
    if (pp === self.root._path || pp === self._path ||
      (pp && pp.indexOf(self._path) === 0)) {
      // console.error('DW Exit (recursive)', entry.basename, self._path)
      self._processing = false
      if (entry._collected) entry.pipe()
      return self._process()
    }
    p = p.parent
  } while (p)

  // console.error("DW not recursive")

  // chop off the entry's root dir, replace with ours
  var props = {
    parent: self,
    root: self.root || self,
    type: entry.type,
    depth: self.depth + 1
  }

  pp = entry._path || entry.path || entry.props.path
  if (entry.parent) {
    pp = pp.substr(entry.parent._path.length + 1)
  }
  // get rid of any ../../ shenanigans
  props.path = path.join(self.path, path.join('/', pp))

  // if i have a filter, the child should inherit it.
  props.filter = self.filter

  // all the rest of the stuff, copy over from the source.
  Object.keys(entry.props).forEach(function (k) {
    if (!props.hasOwnProperty(k)) {
      props[k] = entry.props[k]
    }
  })

  // not sure at this point what kind of writer this is.
  var child = self._currentChild = new Writer(props)
  child.on('ready', function () {
    // console.error("DW Child Ready", child.type, child._path)
    // console.error("  resuming", entry._path)
    entry.pipe(child)
    entry.resume()
  })

  // XXX Make this work in node.
  // Long filenames should not break stuff.
  child.on('error', function (er) {
    if (child._swallowErrors) {
      self.warn(er)
      child.emit('end')
      child.emit('close')
    } else {
      self.emit('error', er)
    }
  })

  // we fire _end internally *after* end, so that we don't move on
  // until any "end" listeners have had their chance to do stuff.
  child.on('close', onend)
  var ended = false
  function onend () {
    if (ended) return
    ended = true
    // console.error("* DW Child end", child.basename)
    self._currentChild = null
    self._processing = false
    self._process()
  }
}

},{"./collect.js":3,"./writer.js":15,"inherits":20,"mkdirp":21,"path":undefined}],6:[function(require,module,exports){
// Basically just a wrapper around an fs.ReadStream

module.exports = FileReader

var fs = require('graceful-fs')
var inherits = require('inherits')
var Reader = require('./reader.js')
var EOF = {EOF: true}
var CLOSE = {CLOSE: true}

inherits(FileReader, Reader)

function FileReader (props) {
  // console.error("    FR create", props.path, props.size, new Error().stack)
  var self = this
  if (!(self instanceof FileReader)) {
    throw new Error('FileReader must be called as constructor.')
  }

  // should already be established as a File type
  // XXX Todo: preserve hardlinks by tracking dev+inode+nlink,
  // with a HardLinkReader class.
  if (!((props.type === 'Link' && props.Link) ||
    (props.type === 'File' && props.File))) {
    throw new Error('Non-file type ' + props.type)
  }

  self._buffer = []
  self._bytesEmitted = 0
  Reader.call(self, props)
}

FileReader.prototype._getStream = function () {
  var self = this
  var stream = self._stream = fs.createReadStream(self._path, self.props)

  if (self.props.blksize) {
    stream.bufferSize = self.props.blksize
  }

  stream.on('open', self.emit.bind(self, 'open'))

  stream.on('data', function (c) {
    // console.error('\t\t%d %s', c.length, self.basename)
    self._bytesEmitted += c.length
    // no point saving empty chunks
    if (!c.length) {
      return
    } else if (self._paused || self._buffer.length) {
      self._buffer.push(c)
      self._read()
    } else self.emit('data', c)
  })

  stream.on('end', function () {
    if (self._paused || self._buffer.length) {
      // console.error('FR Buffering End', self._path)
      self._buffer.push(EOF)
      self._read()
    } else {
      self.emit('end')
    }

    if (self._bytesEmitted !== self.props.size) {
      self.error("Didn't get expected byte count\n" +
        'expect: ' + self.props.size + '\n' +
        'actual: ' + self._bytesEmitted)
    }
  })

  stream.on('close', function () {
    if (self._paused || self._buffer.length) {
      // console.error('FR Buffering Close', self._path)
      self._buffer.push(CLOSE)
      self._read()
    } else {
      // console.error('FR close 1', self._path)
      self.emit('close')
    }
  })

  stream.on('error', function (e) {
    self.emit('error', e)
  })

  self._read()
}

FileReader.prototype._read = function () {
  var self = this
  // console.error('FR _read', self._path)
  if (self._paused) {
    // console.error('FR _read paused', self._path)
    return
  }

  if (!self._stream) {
    // console.error('FR _getStream calling', self._path)
    return self._getStream()
  }

  // clear out the buffer, if there is one.
  if (self._buffer.length) {
    // console.error('FR _read has buffer', self._buffer.length, self._path)
    var buf = self._buffer
    for (var i = 0, l = buf.length; i < l; i++) {
      var c = buf[i]
      if (c === EOF) {
        // console.error('FR Read emitting buffered end', self._path)
        self.emit('end')
      } else if (c === CLOSE) {
        // console.error('FR Read emitting buffered close', self._path)
        self.emit('close')
      } else {
        // console.error('FR Read emitting buffered data', self._path)
        self.emit('data', c)
      }

      if (self._paused) {
        // console.error('FR Read Re-pausing at '+i, self._path)
        self._buffer = buf.slice(i)
        return
      }
    }
    self._buffer.length = 0
  }
// console.error("FR _read done")
// that's about all there is to it.
}

FileReader.prototype.pause = function (who) {
  var self = this
  // console.error('FR Pause', self._path)
  if (self._paused) return
  who = who || self
  self._paused = true
  if (self._stream) self._stream.pause()
  self.emit('pause', who)
}

FileReader.prototype.resume = function (who) {
  var self = this
  // console.error('FR Resume', self._path)
  if (!self._paused) return
  who = who || self
  self.emit('resume', who)
  self._paused = false
  if (self._stream) self._stream.resume()
  self._read()
}

},{"./reader.js":13,"graceful-fs":17,"inherits":20}],7:[function(require,module,exports){
module.exports = FileWriter

var fs = require('graceful-fs')
var Writer = require('./writer.js')
var inherits = require('inherits')
var EOF = {}

inherits(FileWriter, Writer)

function FileWriter (props) {
  var self = this
  if (!(self instanceof FileWriter)) {
    throw new Error('FileWriter must be called as constructor.')
  }

  // should already be established as a File type
  if (props.type !== 'File' || !props.File) {
    throw new Error('Non-file type ' + props.type)
  }

  self._buffer = []
  self._bytesWritten = 0

  Writer.call(this, props)
}

FileWriter.prototype._create = function () {
  var self = this
  if (self._stream) return

  var so = {}
  if (self.props.flags) so.flags = self.props.flags
  so.mode = Writer.filemode
  if (self._old && self._old.blksize) so.bufferSize = self._old.blksize

  self._stream = fs.createWriteStream(self._path, so)

  self._stream.on('open', function () {
    // console.error("FW open", self._buffer, self._path)
    self.ready = true
    self._buffer.forEach(function (c) {
      if (c === EOF) self._stream.end()
      else self._stream.write(c)
    })
    self.emit('ready')
    // give this a kick just in case it needs it.
    self.emit('drain')
  })

  self._stream.on('error', function (er) { self.emit('error', er) })

  self._stream.on('drain', function () { self.emit('drain') })

  self._stream.on('close', function () {
    // console.error('\n\nFW Stream Close', self._path, self.size)
    self._finish()
  })
}

FileWriter.prototype.write = function (c) {
  var self = this

  self._bytesWritten += c.length

  if (!self.ready) {
    if (!Buffer.isBuffer(c) && typeof c !== 'string') {
      throw new Error('invalid write data')
    }
    self._buffer.push(c)
    return false
  }

  var ret = self._stream.write(c)
  // console.error('\t-- fw wrote, _stream says', ret, self._stream._queue.length)

  // allow 2 buffered writes, because otherwise there's just too
  // much stop and go bs.
  if (ret === false && self._stream._queue) {
    return self._stream._queue.length <= 2
  } else {
    return ret
  }
}

FileWriter.prototype.end = function (c) {
  var self = this

  if (c) self.write(c)

  if (!self.ready) {
    self._buffer.push(EOF)
    return false
  }

  return self._stream.end()
}

FileWriter.prototype._finish = function () {
  var self = this
  if (typeof self.size === 'number' && self._bytesWritten !== self.size) {
    self.error(
      'Did not get expected byte count.\n' +
      'expect: ' + self.size + '\n' +
      'actual: ' + self._bytesWritten)
  }
  Writer.prototype._finish.call(self)
}

},{"./writer.js":15,"graceful-fs":17,"inherits":20}],8:[function(require,module,exports){
module.exports = getType

function getType (st) {
  var types = [
    'Directory',
    'File',
    'SymbolicLink',
    'Link', // special for hardlinks from tarballs
    'BlockDevice',
    'CharacterDevice',
    'FIFO',
    'Socket'
  ]
  var type

  if (st.type && types.indexOf(st.type) !== -1) {
    st[st.type] = true
    return st.type
  }

  for (var i = 0, l = types.length; i < l; i++) {
    type = types[i]
    var is = st[type] || st['is' + type]
    if (typeof is === 'function') is = is.call(st)
    if (is) {
      st[type] = true
      st.type = type
      return type
    }
  }

  return null
}

},{}],9:[function(require,module,exports){
// Basically just a wrapper around an fs.readlink
//
// XXX: Enhance this to support the Link type, by keeping
// a lookup table of {<dev+inode>:<path>}, so that hardlinks
// can be preserved in tarballs.

module.exports = LinkReader

var fs = require('graceful-fs')
var inherits = require('inherits')
var Reader = require('./reader.js')

inherits(LinkReader, Reader)

function LinkReader (props) {
  var self = this
  if (!(self instanceof LinkReader)) {
    throw new Error('LinkReader must be called as constructor.')
  }

  if (!((props.type === 'Link' && props.Link) ||
    (props.type === 'SymbolicLink' && props.SymbolicLink))) {
    throw new Error('Non-link type ' + props.type)
  }

  Reader.call(self, props)
}

// When piping a LinkReader into a LinkWriter, we have to
// already have the linkpath property set, so that has to
// happen *before* the "ready" event, which means we need to
// override the _stat method.
LinkReader.prototype._stat = function (currentStat) {
  var self = this
  fs.readlink(self._path, function (er, linkpath) {
    if (er) return self.error(er)
    self.linkpath = self.props.linkpath = linkpath
    self.emit('linkpath', linkpath)
    Reader.prototype._stat.call(self, currentStat)
  })
}

LinkReader.prototype._read = function () {
  var self = this
  if (self._paused) return
  // basically just a no-op, since we got all the info we need
  // from the _stat method
  if (!self._ended) {
    self.emit('end')
    self.emit('close')
    self._ended = true
  }
}

},{"./reader.js":13,"graceful-fs":17,"inherits":20}],10:[function(require,module,exports){
module.exports = LinkWriter

var fs = require('graceful-fs')
var Writer = require('./writer.js')
var inherits = require('inherits')
var path = require('path')
var rimraf = require('rimraf')

inherits(LinkWriter, Writer)

function LinkWriter (props) {
  var self = this
  if (!(self instanceof LinkWriter)) {
    throw new Error('LinkWriter must be called as constructor.')
  }

  // should already be established as a Link type
  if (!((props.type === 'Link' && props.Link) ||
    (props.type === 'SymbolicLink' && props.SymbolicLink))) {
    throw new Error('Non-link type ' + props.type)
  }

  if (props.linkpath === '') props.linkpath = '.'
  if (!props.linkpath) {
    self.error('Need linkpath property to create ' + props.type)
  }

  Writer.call(this, props)
}

LinkWriter.prototype._create = function () {
  // console.error(" LW _create")
  var self = this
  var hard = self.type === 'Link' || process.platform === 'win32'
  var link = hard ? 'link' : 'symlink'
  var lp = hard ? path.resolve(self.dirname, self.linkpath) : self.linkpath

  // can only change the link path by clobbering
  // For hard links, let's just assume that's always the case, since
  // there's no good way to read them if we don't already know.
  if (hard) return clobber(self, lp, link)

  fs.readlink(self._path, function (er, p) {
    // only skip creation if it's exactly the same link
    if (p && p === lp) return finish(self)
    clobber(self, lp, link)
  })
}

function clobber (self, lp, link) {
  rimraf(self._path, function (er) {
    if (er) return self.error(er)
    create(self, lp, link)
  })
}

function create (self, lp, link) {
  fs[link](lp, self._path, function (er) {
    // if this is a hard link, and we're in the process of writing out a
    // directory, it's very possible that the thing we're linking to
    // doesn't exist yet (especially if it was intended as a symlink),
    // so swallow ENOENT errors here and just soldier in.
    // Additionally, an EPERM or EACCES can happen on win32 if it's trying
    // to make a link to a directory.  Again, just skip it.
    // A better solution would be to have fs.symlink be supported on
    // windows in some nice fashion.
    if (er) {
      if ((er.code === 'ENOENT' ||
        er.code === 'EACCES' ||
        er.code === 'EPERM') && process.platform === 'win32') {
        self.ready = true
        self.emit('ready')
        self.emit('end')
        self.emit('close')
        self.end = self._finish = function () {}
      } else return self.error(er)
    }
    finish(self)
  })
}

function finish (self) {
  self.ready = true
  self.emit('ready')
  if (self._ended && !self._finished) self._finish()
}

LinkWriter.prototype.end = function () {
  // console.error("LW finish in end")
  this._ended = true
  if (this.ready) {
    this._finished = true
    this._finish()
  }
}

},{"./writer.js":15,"graceful-fs":17,"inherits":20,"path":undefined,"rimraf":34}],11:[function(require,module,exports){
// A reader for when we don't yet know what kind of thing
// the thing is.

module.exports = ProxyReader

var Reader = require('./reader.js')
var getType = require('./get-type.js')
var inherits = require('inherits')
var fs = require('graceful-fs')

inherits(ProxyReader, Reader)

function ProxyReader (props) {
  var self = this
  if (!(self instanceof ProxyReader)) {
    throw new Error('ProxyReader must be called as constructor.')
  }

  self.props = props
  self._buffer = []
  self.ready = false

  Reader.call(self, props)
}

ProxyReader.prototype._stat = function () {
  var self = this
  var props = self.props
  // stat the thing to see what the proxy should be.
  var stat = props.follow ? 'stat' : 'lstat'

  fs[stat](props.path, function (er, current) {
    var type
    if (er || !current) {
      type = 'File'
    } else {
      type = getType(current)
    }

    props[type] = true
    props.type = self.type = type

    self._old = current
    self._addProxy(Reader(props, current))
  })
}

ProxyReader.prototype._addProxy = function (proxy) {
  var self = this
  if (self._proxyTarget) {
    return self.error('proxy already set')
  }

  self._proxyTarget = proxy
  proxy._proxy = self

  ;[
    'error',
    'data',
    'end',
    'close',
    'linkpath',
    'entry',
    'entryEnd',
    'child',
    'childEnd',
    'warn',
    'stat'
  ].forEach(function (ev) {
    // console.error('~~ proxy event', ev, self.path)
    proxy.on(ev, self.emit.bind(self, ev))
  })

  self.emit('proxy', proxy)

  proxy.on('ready', function () {
    // console.error("~~ proxy is ready!", self.path)
    self.ready = true
    self.emit('ready')
  })

  var calls = self._buffer
  self._buffer.length = 0
  calls.forEach(function (c) {
    proxy[c[0]].apply(proxy, c[1])
  })
}

ProxyReader.prototype.pause = function () {
  return this._proxyTarget ? this._proxyTarget.pause() : false
}

ProxyReader.prototype.resume = function () {
  return this._proxyTarget ? this._proxyTarget.resume() : false
}

},{"./get-type.js":8,"./reader.js":13,"graceful-fs":17,"inherits":20}],12:[function(require,module,exports){
// A writer for when we don't know what kind of thing
// the thing is.  That is, it's not explicitly set,
// so we're going to make it whatever the thing already
// is, or "File"
//
// Until then, collect all events.

module.exports = ProxyWriter

var Writer = require('./writer.js')
var getType = require('./get-type.js')
var inherits = require('inherits')
var collect = require('./collect.js')
var fs = require('fs')

inherits(ProxyWriter, Writer)

function ProxyWriter (props) {
  var self = this
  if (!(self instanceof ProxyWriter)) {
    throw new Error('ProxyWriter must be called as constructor.')
  }

  self.props = props
  self._needDrain = false

  Writer.call(self, props)
}

ProxyWriter.prototype._stat = function () {
  var self = this
  var props = self.props
  // stat the thing to see what the proxy should be.
  var stat = props.follow ? 'stat' : 'lstat'

  fs[stat](props.path, function (er, current) {
    var type
    if (er || !current) {
      type = 'File'
    } else {
      type = getType(current)
    }

    props[type] = true
    props.type = self.type = type

    self._old = current
    self._addProxy(Writer(props, current))
  })
}

ProxyWriter.prototype._addProxy = function (proxy) {
  // console.error("~~ set proxy", this.path)
  var self = this
  if (self._proxy) {
    return self.error('proxy already set')
  }

  self._proxy = proxy
  ;[
    'ready',
    'error',
    'close',
    'pipe',
    'drain',
    'warn'
  ].forEach(function (ev) {
    proxy.on(ev, self.emit.bind(self, ev))
  })

  self.emit('proxy', proxy)

  var calls = self._buffer
  calls.forEach(function (c) {
    // console.error("~~ ~~ proxy buffered call", c[0], c[1])
    proxy[c[0]].apply(proxy, c[1])
  })
  self._buffer.length = 0
  if (self._needsDrain) self.emit('drain')
}

ProxyWriter.prototype.add = function (entry) {
  // console.error("~~ proxy add")
  collect(entry)

  if (!this._proxy) {
    this._buffer.push(['add', [entry]])
    this._needDrain = true
    return false
  }
  return this._proxy.add(entry)
}

ProxyWriter.prototype.write = function (c) {
  // console.error('~~ proxy write')
  if (!this._proxy) {
    this._buffer.push(['write', [c]])
    this._needDrain = true
    return false
  }
  return this._proxy.write(c)
}

ProxyWriter.prototype.end = function (c) {
  // console.error('~~ proxy end')
  if (!this._proxy) {
    this._buffer.push(['end', [c]])
    return false
  }
  return this._proxy.end(c)
}

},{"./collect.js":3,"./get-type.js":8,"./writer.js":15,"fs":undefined,"inherits":20}],13:[function(require,module,exports){
module.exports = Reader

var fs = require('graceful-fs')
var Stream = require('stream').Stream
var inherits = require('inherits')
var path = require('path')
var getType = require('./get-type.js')
var hardLinks = Reader.hardLinks = {}
var Abstract = require('./abstract.js')

// Must do this *before* loading the child classes
inherits(Reader, Abstract)

var LinkReader = require('./link-reader.js')

function Reader (props, currentStat) {
  var self = this
  if (!(self instanceof Reader)) return new Reader(props, currentStat)

  if (typeof props === 'string') {
    props = { path: props }
  }

  if (!props.path) {
    self.error('Must provide a path', null, true)
  }

  // polymorphism.
  // call fstream.Reader(dir) to get a DirReader object, etc.
  // Note that, unlike in the Writer case, ProxyReader is going
  // to be the *normal* state of affairs, since we rarely know
  // the type of a file prior to reading it.

  var type
  var ClassType

  if (props.type && typeof props.type === 'function') {
    type = props.type
    ClassType = type
  } else {
    type = getType(props)
    ClassType = Reader
  }

  if (currentStat && !type) {
    type = getType(currentStat)
    props[type] = true
    props.type = type
  }

  switch (type) {
    case 'Directory':
      ClassType = require('./dir-reader.js')
      break

    case 'Link':
    // XXX hard links are just files.
    // However, it would be good to keep track of files' dev+inode
    // and nlink values, and create a HardLinkReader that emits
    // a linkpath value of the original copy, so that the tar
    // writer can preserve them.
    // ClassType = HardLinkReader
    // break

    case 'File':
      ClassType = require('./file-reader.js')
      break

    case 'SymbolicLink':
      ClassType = LinkReader
      break

    case 'Socket':
      ClassType = require('./socket-reader.js')
      break

    case null:
      ClassType = require('./proxy-reader.js')
      break
  }

  if (!(self instanceof ClassType)) {
    return new ClassType(props)
  }

  Abstract.call(self)

  self.readable = true
  self.writable = false

  self.type = type
  self.props = props
  self.depth = props.depth = props.depth || 0
  self.parent = props.parent || null
  self.root = props.root || (props.parent && props.parent.root) || self

  self._path = self.path = path.resolve(props.path)
  if (process.platform === 'win32') {
    self.path = self._path = self.path.replace(/\?/g, '_')
    if (self._path.length >= 260) {
      // how DOES one create files on the moon?
      // if the path has spaces in it, then UNC will fail.
      self._swallowErrors = true
      // if (self._path.indexOf(" ") === -1) {
      self._path = '\\\\?\\' + self.path.replace(/\//g, '\\')
    // }
    }
  }
  self.basename = props.basename = path.basename(self.path)
  self.dirname = props.dirname = path.dirname(self.path)

  // these have served their purpose, and are now just noisy clutter
  props.parent = props.root = null

  // console.error("\n\n\n%s setting size to", props.path, props.size)
  self.size = props.size
  self.filter = typeof props.filter === 'function' ? props.filter : null
  if (props.sort === 'alpha') props.sort = alphasort

  // start the ball rolling.
  // this will stat the thing, and then call self._read()
  // to start reading whatever it is.
  // console.error("calling stat", props.path, currentStat)
  self._stat(currentStat)
}

function alphasort (a, b) {
  return a === b ? 0
    : a.toLowerCase() > b.toLowerCase() ? 1
      : a.toLowerCase() < b.toLowerCase() ? -1
        : a > b ? 1
          : -1
}

Reader.prototype._stat = function (currentStat) {
  var self = this
  var props = self.props
  var stat = props.follow ? 'stat' : 'lstat'
  // console.error("Reader._stat", self._path, currentStat)
  if (currentStat) process.nextTick(statCb.bind(null, null, currentStat))
  else fs[stat](self._path, statCb)

  function statCb (er, props_) {
    // console.error("Reader._stat, statCb", self._path, props_, props_.nlink)
    if (er) return self.error(er)

    Object.keys(props_).forEach(function (k) {
      props[k] = props_[k]
    })

    // if it's not the expected size, then abort here.
    if (undefined !== self.size && props.size !== self.size) {
      return self.error('incorrect size')
    }
    self.size = props.size

    var type = getType(props)
    var handleHardlinks = props.hardlinks !== false

    // special little thing for handling hardlinks.
    if (handleHardlinks && type !== 'Directory' && props.nlink && props.nlink > 1) {
      var k = props.dev + ':' + props.ino
      // console.error("Reader has nlink", self._path, k)
      if (hardLinks[k] === self._path || !hardLinks[k]) {
        hardLinks[k] = self._path
      } else {
        // switch into hardlink mode.
        type = self.type = self.props.type = 'Link'
        self.Link = self.props.Link = true
        self.linkpath = self.props.linkpath = hardLinks[k]
        // console.error("Hardlink detected, switching mode", self._path, self.linkpath)
        // Setting __proto__ would arguably be the "correct"
        // approach here, but that just seems too wrong.
        self._stat = self._read = LinkReader.prototype._read
      }
    }

    if (self.type && self.type !== type) {
      self.error('Unexpected type: ' + type)
    }

    // if the filter doesn't pass, then just skip over this one.
    // still have to emit end so that dir-walking can move on.
    if (self.filter) {
      var who = self._proxy || self
      // special handling for ProxyReaders
      if (!self.filter.call(who, who, props)) {
        if (!self._disowned) {
          self.abort()
          self.emit('end')
          self.emit('close')
        }
        return
      }
    }

    // last chance to abort or disown before the flow starts!
    var events = ['_stat', 'stat', 'ready']
    var e = 0
    ;(function go () {
      if (self._aborted) {
        self.emit('end')
        self.emit('close')
        return
      }

      if (self._paused && self.type !== 'Directory') {
        self.once('resume', go)
        return
      }

      var ev = events[e++]
      if (!ev) {
        return self._read()
      }
      self.emit(ev, props)
      go()
    })()
  }
}

Reader.prototype.pipe = function (dest) {
  var self = this
  if (typeof dest.add === 'function') {
    // piping to a multi-compatible, and we've got directory entries.
    self.on('entry', function (entry) {
      var ret = dest.add(entry)
      if (ret === false) {
        self.pause()
      }
    })
  }

  // console.error("R Pipe apply Stream Pipe")
  return Stream.prototype.pipe.apply(this, arguments)
}

Reader.prototype.pause = function (who) {
  this._paused = true
  who = who || this
  this.emit('pause', who)
  if (this._stream) this._stream.pause(who)
}

Reader.prototype.resume = function (who) {
  this._paused = false
  who = who || this
  this.emit('resume', who)
  if (this._stream) this._stream.resume(who)
  this._read()
}

Reader.prototype._read = function () {
  this.error('Cannot read unknown type: ' + this.type)
}

},{"./abstract.js":2,"./dir-reader.js":4,"./file-reader.js":6,"./get-type.js":8,"./link-reader.js":9,"./proxy-reader.js":11,"./socket-reader.js":14,"graceful-fs":17,"inherits":20,"path":undefined,"stream":undefined}],14:[function(require,module,exports){
// Just get the stats, and then don't do anything.
// You can't really "read" from a socket.  You "connect" to it.
// Mostly, this is here so that reading a dir with a socket in it
// doesn't blow up.

module.exports = SocketReader

var inherits = require('inherits')
var Reader = require('./reader.js')

inherits(SocketReader, Reader)

function SocketReader (props) {
  var self = this
  if (!(self instanceof SocketReader)) {
    throw new Error('SocketReader must be called as constructor.')
  }

  if (!(props.type === 'Socket' && props.Socket)) {
    throw new Error('Non-socket type ' + props.type)
  }

  Reader.call(self, props)
}

SocketReader.prototype._read = function () {
  var self = this
  if (self._paused) return
  // basically just a no-op, since we got all the info we have
  // from the _stat method
  if (!self._ended) {
    self.emit('end')
    self.emit('close')
    self._ended = true
  }
}

},{"./reader.js":13,"inherits":20}],15:[function(require,module,exports){
module.exports = Writer

var fs = require('graceful-fs')
var inherits = require('inherits')
var rimraf = require('rimraf')
var mkdir = require('mkdirp')
var path = require('path')
var umask = process.platform === 'win32' ? 0 : process.umask()
var getType = require('./get-type.js')
var Abstract = require('./abstract.js')

// Must do this *before* loading the child classes
inherits(Writer, Abstract)

Writer.dirmode = parseInt('0777', 8) & (~umask)
Writer.filemode = parseInt('0666', 8) & (~umask)

var DirWriter = require('./dir-writer.js')
var LinkWriter = require('./link-writer.js')
var FileWriter = require('./file-writer.js')
var ProxyWriter = require('./proxy-writer.js')

// props is the desired state.  current is optionally the current stat,
// provided here so that subclasses can avoid statting the target
// more than necessary.
function Writer (props, current) {
  var self = this

  if (typeof props === 'string') {
    props = { path: props }
  }

  if (!props.path) self.error('Must provide a path', null, true)

  // polymorphism.
  // call fstream.Writer(dir) to get a DirWriter object, etc.
  var type = getType(props)
  var ClassType = Writer

  switch (type) {
    case 'Directory':
      ClassType = DirWriter
      break
    case 'File':
      ClassType = FileWriter
      break
    case 'Link':
    case 'SymbolicLink':
      ClassType = LinkWriter
      break
    case null:
    default:
      // Don't know yet what type to create, so we wrap in a proxy.
      ClassType = ProxyWriter
      break
  }

  if (!(self instanceof ClassType)) return new ClassType(props)

  // now get down to business.

  Abstract.call(self)

  // props is what we want to set.
  // set some convenience properties as well.
  self.type = props.type
  self.props = props
  self.depth = props.depth || 0
  self.clobber = props.clobber === false ? props.clobber : true
  self.parent = props.parent || null
  self.root = props.root || (props.parent && props.parent.root) || self

  self._path = self.path = path.resolve(props.path)
  if (process.platform === 'win32') {
    self.path = self._path = self.path.replace(/\?/g, '_')
    if (self._path.length >= 260) {
      self._swallowErrors = true
      self._path = '\\\\?\\' + self.path.replace(/\//g, '\\')
    }
  }
  self.basename = path.basename(props.path)
  self.dirname = path.dirname(props.path)
  self.linkpath = props.linkpath || null

  props.parent = props.root = null

  // console.error("\n\n\n%s setting size to", props.path, props.size)
  self.size = props.size

  if (typeof props.mode === 'string') {
    props.mode = parseInt(props.mode, 8)
  }

  self.readable = false
  self.writable = true

  // buffer until ready, or while handling another entry
  self._buffer = []
  self.ready = false

  self.filter = typeof props.filter === 'function' ? props.filter : null

  // start the ball rolling.
  // this checks what's there already, and then calls
  // self._create() to call the impl-specific creation stuff.
  self._stat(current)
}

// Calling this means that it's something we can't create.
// Just assert that it's already there, otherwise raise a warning.
Writer.prototype._create = function () {
  var self = this
  fs[self.props.follow ? 'stat' : 'lstat'](self._path, function (er) {
    if (er) {
      return self.warn('Cannot create ' + self._path + '\n' +
        'Unsupported type: ' + self.type, 'ENOTSUP')
    }
    self._finish()
  })
}

Writer.prototype._stat = function (current) {
  var self = this
  var props = self.props
  var stat = props.follow ? 'stat' : 'lstat'
  var who = self._proxy || self

  if (current) statCb(null, current)
  else fs[stat](self._path, statCb)

  function statCb (er, current) {
    if (self.filter && !self.filter.call(who, who, current)) {
      self._aborted = true
      self.emit('end')
      self.emit('close')
      return
    }

    // if it's not there, great.  We'll just create it.
    // if it is there, then we'll need to change whatever differs
    if (er || !current) {
      return create(self)
    }

    self._old = current
    var currentType = getType(current)

    // if it's a type change, then we need to clobber or error.
    // if it's not a type change, then let the impl take care of it.
    if (currentType !== self.type) {
      return rimraf(self._path, function (er) {
        if (er) return self.error(er)
        self._old = null
        create(self)
      })
    }

    // otherwise, just handle in the app-specific way
    // this creates a fs.WriteStream, or mkdir's, or whatever
    create(self)
  }
}

function create (self) {
  // console.error("W create", self._path, Writer.dirmode)

  // XXX Need to clobber non-dirs that are in the way,
  // unless { clobber: false } in the props.
  mkdir(path.dirname(self._path), Writer.dirmode, function (er, made) {
    // console.error("W created", path.dirname(self._path), er)
    if (er) return self.error(er)

    // later on, we have to set the mode and owner for these
    self._madeDir = made
    return self._create()
  })
}

function endChmod (self, want, current, path, cb) {
  var wantMode = want.mode
  var chmod = want.follow || self.type !== 'SymbolicLink'
    ? 'chmod' : 'lchmod'

  if (!fs[chmod]) return cb()
  if (typeof wantMode !== 'number') return cb()

  var curMode = current.mode & parseInt('0777', 8)
  wantMode = wantMode & parseInt('0777', 8)
  if (wantMode === curMode) return cb()

  fs[chmod](path, wantMode, cb)
}

function endChown (self, want, current, path, cb) {
  // Don't even try it unless root.  Too easy to EPERM.
  if (process.platform === 'win32') return cb()
  if (!process.getuid || process.getuid() !== 0) return cb()
  if (typeof want.uid !== 'number' &&
    typeof want.gid !== 'number') return cb()

  if (current.uid === want.uid &&
    current.gid === want.gid) return cb()

  var chown = (self.props.follow || self.type !== 'SymbolicLink')
    ? 'chown' : 'lchown'
  if (!fs[chown]) return cb()

  if (typeof want.uid !== 'number') want.uid = current.uid
  if (typeof want.gid !== 'number') want.gid = current.gid

  fs[chown](path, want.uid, want.gid, cb)
}

function endUtimes (self, want, current, path, cb) {
  if (!fs.utimes || process.platform === 'win32') return cb()

  var utimes = (want.follow || self.type !== 'SymbolicLink')
    ? 'utimes' : 'lutimes'

  if (utimes === 'lutimes' && !fs[utimes]) {
    utimes = 'utimes'
  }

  if (!fs[utimes]) return cb()

  var curA = current.atime
  var curM = current.mtime
  var meA = want.atime
  var meM = want.mtime

  if (meA === undefined) meA = curA
  if (meM === undefined) meM = curM

  if (!isDate(meA)) meA = new Date(meA)
  if (!isDate(meM)) meA = new Date(meM)

  if (meA.getTime() === curA.getTime() &&
    meM.getTime() === curM.getTime()) return cb()

  fs[utimes](path, meA, meM, cb)
}

// XXX This function is beastly.  Break it up!
Writer.prototype._finish = function () {
  var self = this

  if (self._finishing) return
  self._finishing = true

  // console.error(" W Finish", self._path, self.size)

  // set up all the things.
  // At this point, we're already done writing whatever we've gotta write,
  // adding files to the dir, etc.
  var todo = 0
  var errState = null
  var done = false

  if (self._old) {
    // the times will almost *certainly* have changed.
    // adds the utimes syscall, but remove another stat.
    self._old.atime = new Date(0)
    self._old.mtime = new Date(0)
    // console.error(" W Finish Stale Stat", self._path, self.size)
    setProps(self._old)
  } else {
    var stat = self.props.follow ? 'stat' : 'lstat'
    // console.error(" W Finish Stating", self._path, self.size)
    fs[stat](self._path, function (er, current) {
      // console.error(" W Finish Stated", self._path, self.size, current)
      if (er) {
        // if we're in the process of writing out a
        // directory, it's very possible that the thing we're linking to
        // doesn't exist yet (especially if it was intended as a symlink),
        // so swallow ENOENT errors here and just soldier on.
        if (er.code === 'ENOENT' &&
          (self.type === 'Link' || self.type === 'SymbolicLink') &&
          process.platform === 'win32') {
          self.ready = true
          self.emit('ready')
          self.emit('end')
          self.emit('close')
          self.end = self._finish = function () {}
          return
        } else return self.error(er)
      }
      setProps(self._old = current)
    })
  }

  return

  function setProps (current) {
    todo += 3
    endChmod(self, self.props, current, self._path, next('chmod'))
    endChown(self, self.props, current, self._path, next('chown'))
    endUtimes(self, self.props, current, self._path, next('utimes'))
  }

  function next (what) {
    return function (er) {
      // console.error("   W Finish", what, todo)
      if (errState) return
      if (er) {
        er.fstream_finish_call = what
        return self.error(errState = er)
      }
      if (--todo > 0) return
      if (done) return
      done = true

      // we may still need to set the mode/etc. on some parent dirs
      // that were created previously.  delay end/close until then.
      if (!self._madeDir) return end()
      else endMadeDir(self, self._path, end)

      function end (er) {
        if (er) {
          er.fstream_finish_call = 'setupMadeDir'
          return self.error(er)
        }
        // all the props have been set, so we're completely done.
        self.emit('end')
        self.emit('close')
      }
    }
  }
}

function endMadeDir (self, p, cb) {
  var made = self._madeDir
  // everything *between* made and path.dirname(self._path)
  // needs to be set up.  Note that this may just be one dir.
  var d = path.dirname(p)

  endMadeDir_(self, d, function (er) {
    if (er) return cb(er)
    if (d === made) {
      return cb()
    }
    endMadeDir(self, d, cb)
  })
}

function endMadeDir_ (self, p, cb) {
  var dirProps = {}
  Object.keys(self.props).forEach(function (k) {
    dirProps[k] = self.props[k]

    // only make non-readable dirs if explicitly requested.
    if (k === 'mode' && self.type !== 'Directory') {
      dirProps[k] = dirProps[k] | parseInt('0111', 8)
    }
  })

  var todo = 3
  var errState = null
  fs.stat(p, function (er, current) {
    if (er) return cb(errState = er)
    endChmod(self, dirProps, current, p, next)
    endChown(self, dirProps, current, p, next)
    endUtimes(self, dirProps, current, p, next)
  })

  function next (er) {
    if (errState) return
    if (er) return cb(errState = er)
    if (--todo === 0) return cb()
  }
}

Writer.prototype.pipe = function () {
  this.error("Can't pipe from writable stream")
}

Writer.prototype.add = function () {
  this.error("Can't add to non-Directory type")
}

Writer.prototype.write = function () {
  return true
}

function objectToString (d) {
  return Object.prototype.toString.call(d)
}

function isDate (d) {
  return typeof d === 'object' && objectToString(d) === '[object Date]'
}

},{"./abstract.js":2,"./dir-writer.js":5,"./file-writer.js":7,"./get-type.js":8,"./link-writer.js":10,"./proxy-writer.js":12,"graceful-fs":17,"inherits":20,"mkdirp":21,"path":undefined,"rimraf":34}],16:[function(require,module,exports){
'use strict'

var fs = require('fs')

module.exports = clone(fs)

function clone (obj) {
  if (obj === null || typeof obj !== 'object')
    return obj

  if (obj instanceof Object)
    var copy = { __proto__: obj.__proto__ }
  else
    var copy = Object.create(null)

  Object.getOwnPropertyNames(obj).forEach(function (key) {
    Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key))
  })

  return copy
}

},{"fs":undefined}],17:[function(require,module,exports){
var fs = require('fs')
var polyfills = require('./polyfills.js')
var legacy = require('./legacy-streams.js')
var queue = []

var util = require('util')

function noop () {}

var debug = noop
if (util.debuglog)
  debug = util.debuglog('gfs4')
else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ''))
  debug = function() {
    var m = util.format.apply(util, arguments)
    m = 'GFS4: ' + m.split(/\n/).join('\nGFS4: ')
    console.error(m)
  }

if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) {
  process.on('exit', function() {
    debug(queue)
    require('assert').equal(queue.length, 0)
  })
}

module.exports = patch(require('./fs.js'))
if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH) {
  module.exports = patch(fs)
}

// Always patch fs.close/closeSync, because we want to
// retry() whenever a close happens *anywhere* in the program.
// This is essential when multiple graceful-fs instances are
// in play at the same time.
module.exports.close =
fs.close = (function (fs$close) { return function (fd, cb) {
  return fs$close.call(fs, fd, function (err) {
    if (!err)
      retry()

    if (typeof cb === 'function')
      cb.apply(this, arguments)
  })
}})(fs.close)

module.exports.closeSync =
fs.closeSync = (function (fs$closeSync) { return function (fd) {
  // Note that graceful-fs also retries when fs.closeSync() fails.
  // Looks like a bug to me, although it's probably a harmless one.
  var rval = fs$closeSync.apply(fs, arguments)
  retry()
  return rval
}})(fs.closeSync)

function patch (fs) {
  // Everything that references the open() function needs to be in here
  polyfills(fs)
  fs.gracefulify = patch
  fs.FileReadStream = ReadStream;  // Legacy name.
  fs.FileWriteStream = WriteStream;  // Legacy name.
  fs.createReadStream = createReadStream
  fs.createWriteStream = createWriteStream
  var fs$readFile = fs.readFile
  fs.readFile = readFile
  function readFile (path, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    return go$readFile(path, options, cb)

    function go$readFile (path, options, cb) {
      return fs$readFile(path, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$readFile, [path, options, cb]])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
          retry()
        }
      })
    }
  }

  var fs$writeFile = fs.writeFile
  fs.writeFile = writeFile
  function writeFile (path, data, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    return go$writeFile(path, data, options, cb)

    function go$writeFile (path, data, options, cb) {
      return fs$writeFile(path, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$writeFile, [path, data, options, cb]])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
          retry()
        }
      })
    }
  }

  var fs$appendFile = fs.appendFile
  if (fs$appendFile)
    fs.appendFile = appendFile
  function appendFile (path, data, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    return go$appendFile(path, data, options, cb)

    function go$appendFile (path, data, options, cb) {
      return fs$appendFile(path, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$appendFile, [path, data, options, cb]])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
          retry()
        }
      })
    }
  }

  var fs$readdir = fs.readdir
  fs.readdir = readdir
  function readdir (path, cb) {
    return go$readdir(path, cb)

    function go$readdir () {
      return fs$readdir(path, function (err, files) {
        if (files && files.sort)
          files.sort();  // Backwards compatibility with graceful-fs.

        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$readdir, [path, cb]])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
          retry()
        }
      })
    }
  }


  if (process.version.substr(0, 4) === 'v0.8') {
    var legStreams = legacy(fs)
    ReadStream = legStreams.ReadStream
    WriteStream = legStreams.WriteStream
  }

  var fs$ReadStream = fs.ReadStream
  ReadStream.prototype = Object.create(fs$ReadStream.prototype)
  ReadStream.prototype.open = ReadStream$open

  var fs$WriteStream = fs.WriteStream
  WriteStream.prototype = Object.create(fs$WriteStream.prototype)
  WriteStream.prototype.open = WriteStream$open

  fs.ReadStream = ReadStream
  fs.WriteStream = WriteStream

  function ReadStream (path, options) {
    if (this instanceof ReadStream)
      return fs$ReadStream.apply(this, arguments), this
    else
      return ReadStream.apply(Object.create(ReadStream.prototype), arguments)
  }

  function ReadStream$open () {
    var that = this
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        if (that.autoClose)
          that.destroy()

        that.emit('error', err)
      } else {
        that.fd = fd
        that.emit('open', fd)
        that.read()
      }
    })
  }

  function WriteStream (path, options) {
    if (this instanceof WriteStream)
      return fs$WriteStream.apply(this, arguments), this
    else
      return WriteStream.apply(Object.create(WriteStream.prototype), arguments)
  }

  function WriteStream$open () {
    var that = this
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        that.destroy()
        that.emit('error', err)
      } else {
        that.fd = fd
        that.emit('open', fd)
      }
    })
  }

  function createReadStream (path, options) {
    return new ReadStream(path, options)
  }

  function createWriteStream (path, options) {
    return new WriteStream(path, options)
  }

  var fs$open = fs.open
  fs.open = open
  function open (path, flags, mode, cb) {
    if (typeof mode === 'function')
      cb = mode, mode = null

    return go$open(path, flags, mode, cb)

    function go$open (path, flags, mode, cb) {
      return fs$open(path, flags, mode, function (err, fd) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$open, [path, flags, mode, cb]])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
          retry()
        }
      })
    }
  }

  return fs
}

function enqueue (elem) {
  debug('ENQUEUE', elem[0].name, elem[1])
  queue.push(elem)
}

function retry () {
  var elem = queue.shift()
  if (elem) {
    debug('RETRY', elem[0].name, elem[1])
    elem[0].apply(null, elem[1])
  }
}

},{"./fs.js":16,"./legacy-streams.js":18,"./polyfills.js":19,"assert":undefined,"fs":undefined,"util":undefined}],18:[function(require,module,exports){
var Stream = require('stream').Stream

module.exports = legacy

function legacy (fs) {
  return {
    ReadStream: ReadStream,
    WriteStream: WriteStream
  }

  function ReadStream (path, options) {
    if (!(this instanceof ReadStream)) return new ReadStream(path, options);

    Stream.call(this);

    var self = this;

    this.path = path;
    this.fd = null;
    this.readable = true;
    this.paused = false;

    this.flags = 'r';
    this.mode = 438; /*=0666*/
    this.bufferSize = 64 * 1024;

    options = options || {};

    // Mixin options into this
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.encoding) this.setEncoding(this.encoding);

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.end === undefined) {
        this.end = Infinity;
      } else if ('number' !== typeof this.end) {
        throw TypeError('end must be a Number');
      }

      if (this.start > this.end) {
        throw new Error('start must be <= end');
      }

      this.pos = this.start;
    }

    if (this.fd !== null) {
      process.nextTick(function() {
        self._read();
      });
      return;
    }

    fs.open(this.path, this.flags, this.mode, function (err, fd) {
      if (err) {
        self.emit('error', err);
        self.readable = false;
        return;
      }

      self.fd = fd;
      self.emit('open', fd);
      self._read();
    })
  }

  function WriteStream (path, options) {
    if (!(this instanceof WriteStream)) return new WriteStream(path, options);

    Stream.call(this);

    this.path = path;
    this.fd = null;
    this.writable = true;

    this.flags = 'w';
    this.encoding = 'binary';
    this.mode = 438; /*=0666*/
    this.bytesWritten = 0;

    options = options || {};

    // Mixin options into this
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.start < 0) {
        throw new Error('start must be >= zero');
      }

      this.pos = this.start;
    }

    this.busy = false;
    this._queue = [];

    if (this.fd === null) {
      this._open = fs.open;
      this._queue.push([this._open, this.path, this.flags, this.mode, undefined]);
      this.flush();
    }
  }
}

},{"stream":undefined}],19:[function(require,module,exports){
var fs = require('./fs.js')
var constants = require('constants')

var origCwd = process.cwd
var cwd = null
process.cwd = function() {
  if (!cwd)
    cwd = origCwd.call(process)
  return cwd
}
try {
  process.cwd()
} catch (er) {}

var chdir = process.chdir
process.chdir = function(d) {
  cwd = null
  chdir.call(process, d)
}

module.exports = patch

function patch (fs) {
  // (re-)implement some things that are known busted or missing.

  // lchmod, broken prior to 0.6.2
  // back-port the fix here.
  if (constants.hasOwnProperty('O_SYMLINK') &&
      process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
    patchLchmod(fs)
  }

  // lutimes implementation, or no-op
  if (!fs.lutimes) {
    patchLutimes(fs)
  }

  // https://github.com/isaacs/node-graceful-fs/issues/4
  // Chown should not fail on einval or eperm if non-root.
  // It should not fail on enosys ever, as this just indicates
  // that a fs doesn't support the intended operation.

  fs.chown = chownFix(fs.chown)
  fs.fchown = chownFix(fs.fchown)
  fs.lchown = chownFix(fs.lchown)

  fs.chmod = chownFix(fs.chmod)
  fs.fchmod = chownFix(fs.fchmod)
  fs.lchmod = chownFix(fs.lchmod)

  fs.chownSync = chownFixSync(fs.chownSync)
  fs.fchownSync = chownFixSync(fs.fchownSync)
  fs.lchownSync = chownFixSync(fs.lchownSync)

  fs.chmodSync = chownFix(fs.chmodSync)
  fs.fchmodSync = chownFix(fs.fchmodSync)
  fs.lchmodSync = chownFix(fs.lchmodSync)

  // if lchmod/lchown do not exist, then make them no-ops
  if (!fs.lchmod) {
    fs.lchmod = function (path, mode, cb) {
      process.nextTick(cb)
    }
    fs.lchmodSync = function () {}
  }
  if (!fs.lchown) {
    fs.lchown = function (path, uid, gid, cb) {
      process.nextTick(cb)
    }
    fs.lchownSync = function () {}
  }

  // on Windows, A/V software can lock the directory, causing this
  // to fail with an EACCES or EPERM if the directory contains newly
  // created files.  Try again on failure, for up to 1 second.
  if (process.platform === "win32") {
    fs.rename = (function (fs$rename) { return function (from, to, cb) {
      var start = Date.now()
      fs$rename(from, to, function CB (er) {
        if (er
            && (er.code === "EACCES" || er.code === "EPERM")
            && Date.now() - start < 1000) {
          return fs$rename(from, to, CB)
        }
        if (cb) cb(er)
      })
    }})(fs.rename)
  }

  // if read() returns EAGAIN, then just try it again.
  fs.read = (function (fs$read) { return function (fd, buffer, offset, length, position, callback_) {
    var callback
    if (callback_ && typeof callback_ === 'function') {
      var eagCounter = 0
      callback = function (er, _, __) {
        if (er && er.code === 'EAGAIN' && eagCounter < 10) {
          eagCounter ++
          return fs$read.call(fs, fd, buffer, offset, length, position, callback)
        }
        callback_.apply(this, arguments)
      }
    }
    return fs$read.call(fs, fd, buffer, offset, length, position, callback)
  }})(fs.read)

  fs.readSync = (function (fs$readSync) { return function (fd, buffer, offset, length, position) {
    var eagCounter = 0
    while (true) {
      try {
        return fs$readSync.call(fs, fd, buffer, offset, length, position)
      } catch (er) {
        if (er.code === 'EAGAIN' && eagCounter < 10) {
          eagCounter ++
          continue
        }
        throw er
      }
    }
  }})(fs.readSync)
}

function patchLchmod (fs) {
  fs.lchmod = function (path, mode, callback) {
    callback = callback || noop
    fs.open( path
           , constants.O_WRONLY | constants.O_SYMLINK
           , mode
           , function (err, fd) {
      if (err) {
        callback(err)
        return
      }
      // prefer to return the chmod error, if one occurs,
      // but still try to close, and report closing errors if they occur.
      fs.fchmod(fd, mode, function (err) {
        fs.close(fd, function(err2) {
          callback(err || err2)
        })
      })
    })
  }

  fs.lchmodSync = function (path, mode) {
    var fd = fs.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode)

    // prefer to return the chmod error, if one occurs,
    // but still try to close, and report closing errors if they occur.
    var threw = true
    var ret
    try {
      ret = fs.fchmodSync(fd, mode)
      threw = false
    } finally {
      if (threw) {
        try {
          fs.closeSync(fd)
        } catch (er) {}
      } else {
        fs.closeSync(fd)
      }
    }
    return ret
  }
}

function patchLutimes (fs) {
  if (constants.hasOwnProperty("O_SYMLINK")) {
    fs.lutimes = function (path, at, mt, cb) {
      fs.open(path, constants.O_SYMLINK, function (er, fd) {
        cb = cb || noop
        if (er) return cb(er)
        fs.futimes(fd, at, mt, function (er) {
          fs.close(fd, function (er2) {
            return cb(er || er2)
          })
        })
      })
    }

    fs.lutimesSync = function (path, at, mt) {
      var fd = fs.openSync(path, constants.O_SYMLINK)
      var ret
      var threw = true
      try {
        ret = fs.futimesSync(fd, at, mt)
        threw = false
      } finally {
        if (threw) {
          try {
            fs.closeSync(fd)
          } catch (er) {}
        } else {
          fs.closeSync(fd)
        }
      }
      return ret
    }

  } else {
    fs.lutimes = function (_a, _b, _c, cb) { process.nextTick(cb) }
    fs.lutimesSync = function () {}
  }
}

function chownFix (orig) {
  if (!orig) return orig
  return function (target, uid, gid, cb) {
    return orig.call(fs, target, uid, gid, function (er, res) {
      if (chownErOk(er)) er = null
      cb(er, res)
    })
  }
}

function chownFixSync (orig) {
  if (!orig) return orig
  return function (target, uid, gid) {
    try {
      return orig.call(fs, target, uid, gid)
    } catch (er) {
      if (!chownErOk(er)) throw er
    }
  }
}

// ENOSYS means that the fs doesn't support the op. Just ignore
// that, because it doesn't matter.
//
// if there's no getuid, or if getuid() is something other
// than 0, and the error is EINVAL or EPERM, then just ignore
// it.
//
// This specific case is a silent failure in cp, install, tar,
// and most other unix tools that manage permissions.
//
// When running as root, or if other types of errors are
// encountered, then it's strict.
function chownErOk (er) {
  if (!er)
    return true

  if (er.code === "ENOSYS")
    return true

  var nonroot = !process.getuid || process.getuid() !== 0
  if (nonroot) {
    if (er.code === "EINVAL" || er.code === "EPERM")
      return true
  }

  return false
}

},{"./fs.js":16,"constants":undefined}],20:[function(require,module,exports){
module.exports = require('util').inherits

},{"util":undefined}],21:[function(require,module,exports){
var path = require('path');
var fs = require('fs');
var _0777 = parseInt('0777', 8);

module.exports = mkdirP.mkdirp = mkdirP.mkdirP = mkdirP;

function mkdirP (p, opts, f, made) {
    if (typeof opts === 'function') {
        f = opts;
        opts = {};
    }
    else if (!opts || typeof opts !== 'object') {
        opts = { mode: opts };
    }
    
    var mode = opts.mode;
    var xfs = opts.fs || fs;
    
    if (mode === undefined) {
        mode = _0777 & (~process.umask());
    }
    if (!made) made = null;
    
    var cb = f || function () {};
    p = path.resolve(p);
    
    xfs.mkdir(p, mode, function (er) {
        if (!er) {
            made = made || p;
            return cb(null, made);
        }
        switch (er.code) {
            case 'ENOENT':
                mkdirP(path.dirname(p), opts, function (er, made) {
                    if (er) cb(er, made);
                    else mkdirP(p, opts, cb, made);
                });
                break;

            // In the case of any other error, just see if there's a dir
            // there already.  If so, then hooray!  If not, then something
            // is borked.
            default:
                xfs.stat(p, function (er2, stat) {
                    // if the stat fails, then that's super weird.
                    // let the original error be the failure reason.
                    if (er2 || !stat.isDirectory()) cb(er, made)
                    else cb(null, made);
                });
                break;
        }
    });
}

mkdirP.sync = function sync (p, opts, made) {
    if (!opts || typeof opts !== 'object') {
        opts = { mode: opts };
    }
    
    var mode = opts.mode;
    var xfs = opts.fs || fs;
    
    if (mode === undefined) {
        mode = _0777 & (~process.umask());
    }
    if (!made) made = null;

    p = path.resolve(p);

    try {
        xfs.mkdirSync(p, mode);
        made = made || p;
    }
    catch (err0) {
        switch (err0.code) {
            case 'ENOENT' :
                made = sync(path.dirname(p), opts, made);
                sync(p, opts, made);
                break;

            // In the case of any other error, just see if there's a dir
            // there already.  If so, then hooray!  If not, then something
            // is borked.
            default:
                var stat;
                try {
                    stat = xfs.statSync(p);
                }
                catch (err1) {
                    throw err0;
                }
                if (!stat.isDirectory()) throw err0;
                break;
        }
    }

    return made;
};

},{"fs":undefined,"path":undefined}],22:[function(require,module,exports){
exports.alphasort = alphasort
exports.alphasorti = alphasorti
exports.setopts = setopts
exports.ownProp = ownProp
exports.makeAbs = makeAbs
exports.finish = finish
exports.mark = mark
exports.isIgnored = isIgnored
exports.childrenIgnored = childrenIgnored

function ownProp (obj, field) {
  return Object.prototype.hasOwnProperty.call(obj, field)
}

var path = require("path")
var minimatch = require("minimatch")
var isAbsolute = require("path-is-absolute")
var Minimatch = minimatch.Minimatch

function alphasorti (a, b) {
  return a.toLowerCase().localeCompare(b.toLowerCase())
}

function alphasort (a, b) {
  return a.localeCompare(b)
}

function setupIgnores (self, options) {
  self.ignore = options.ignore || []

  if (!Array.isArray(self.ignore))
    self.ignore = [self.ignore]

  if (self.ignore.length) {
    self.ignore = self.ignore.map(ignoreMap)
  }
}

// ignore patterns are always in dot:true mode.
function ignoreMap (pattern) {
  var gmatcher = null
  if (pattern.slice(-3) === '/**') {
    var gpattern = pattern.replace(/(\/\*\*)+$/, '')
    gmatcher = new Minimatch(gpattern, { dot: true })
  }

  return {
    matcher: new Minimatch(pattern, { dot: true }),
    gmatcher: gmatcher
  }
}

function setopts (self, pattern, options) {
  if (!options)
    options = {}

  // base-matching: just use globstar for that.
  if (options.matchBase && -1 === pattern.indexOf("/")) {
    if (options.noglobstar) {
      throw new Error("base matching requires globstar")
    }
    pattern = "**/" + pattern
  }

  self.silent = !!options.silent
  self.pattern = pattern
  self.strict = options.strict !== false
  self.realpath = !!options.realpath
  self.realpathCache = options.realpathCache || Object.create(null)
  self.follow = !!options.follow
  self.dot = !!options.dot
  self.mark = !!options.mark
  self.nodir = !!options.nodir
  if (self.nodir)
    self.mark = true
  self.sync = !!options.sync
  self.nounique = !!options.nounique
  self.nonull = !!options.nonull
  self.nosort = !!options.nosort
  self.nocase = !!options.nocase
  self.stat = !!options.stat
  self.noprocess = !!options.noprocess

  self.maxLength = options.maxLength || Infinity
  self.cache = options.cache || Object.create(null)
  self.statCache = options.statCache || Object.create(null)
  self.symlinks = options.symlinks || Object.create(null)

  setupIgnores(self, options)

  self.changedCwd = false
  var cwd = process.cwd()
  if (!ownProp(options, "cwd"))
    self.cwd = cwd
  else {
    self.cwd = path.resolve(options.cwd)
    self.changedCwd = self.cwd !== cwd
  }

  self.root = options.root || path.resolve(self.cwd, "/")
  self.root = path.resolve(self.root)
  if (process.platform === "win32")
    self.root = self.root.replace(/\\/g, "/")

  self.nomount = !!options.nomount

  // disable comments and negation in Minimatch.
  // Note that they are not supported in Glob itself anyway.
  options.nonegate = true
  options.nocomment = true

  self.minimatch = new Minimatch(pattern, options)
  self.options = self.minimatch.options
}

function finish (self) {
  var nou = self.nounique
  var all = nou ? [] : Object.create(null)

  for (var i = 0, l = self.matches.length; i < l; i ++) {
    var matches = self.matches[i]
    if (!matches || Object.keys(matches).length === 0) {
      if (self.nonull) {
        // do like the shell, and spit out the literal glob
        var literal = self.minimatch.globSet[i]
        if (nou)
          all.push(literal)
        else
          all[literal] = true
      }
    } else {
      // had matches
      var m = Object.keys(matches)
      if (nou)
        all.push.apply(all, m)
      else
        m.forEach(function (m) {
          all[m] = true
        })
    }
  }

  if (!nou)
    all = Object.keys(all)

  if (!self.nosort)
    all = all.sort(self.nocase ? alphasorti : alphasort)

  // at *some* point we statted all of these
  if (self.mark) {
    for (var i = 0; i < all.length; i++) {
      all[i] = self._mark(all[i])
    }
    if (self.nodir) {
      all = all.filter(function (e) {
        return !(/\/$/.test(e))
      })
    }
  }

  if (self.ignore.length)
    all = all.filter(function(m) {
      return !isIgnored(self, m)
    })

  self.found = all
}

function mark (self, p) {
  var abs = makeAbs(self, p)
  var c = self.cache[abs]
  var m = p
  if (c) {
    var isDir = c === 'DIR' || Array.isArray(c)
    var slash = p.slice(-1) === '/'

    if (isDir && !slash)
      m += '/'
    else if (!isDir && slash)
      m = m.slice(0, -1)

    if (m !== p) {
      var mabs = makeAbs(self, m)
      self.statCache[mabs] = self.statCache[abs]
      self.cache[mabs] = self.cache[abs]
    }
  }

  return m
}

// lotta situps...
function makeAbs (self, f) {
  var abs = f
  if (f.charAt(0) === '/') {
    abs = path.join(self.root, f)
  } else if (isAbsolute(f) || f === '') {
    abs = f
  } else if (self.changedCwd) {
    abs = path.resolve(self.cwd, f)
  } else {
    abs = path.resolve(f)
  }
  return abs
}


// Return true, if pattern ends with globstar '**', for the accompanying parent directory.
// Ex:- If node_modules/** is the pattern, add 'node_modules' to ignore list along with it's contents
function isIgnored (self, path) {
  if (!self.ignore.length)
    return false

  return self.ignore.some(function(item) {
    return item.matcher.match(path) || !!(item.gmatcher && item.gmatcher.match(path))
  })
}

function childrenIgnored (self, path) {
  if (!self.ignore.length)
    return false

  return self.ignore.some(function(item) {
    return !!(item.gmatcher && item.gmatcher.match(path))
  })
}

},{"minimatch":26,"path":undefined,"path-is-absolute":32}],23:[function(require,module,exports){
// Approach:
//
// 1. Get the minimatch set
// 2. For each pattern in the set, PROCESS(pattern, false)
// 3. Store matches per-set, then uniq them
//
// PROCESS(pattern, inGlobStar)
// Get the first [n] items from pattern that are all strings
// Join these together.  This is PREFIX.
//   If there is no more remaining, then stat(PREFIX) and
//   add to matches if it succeeds.  END.
//
// If inGlobStar and PREFIX is symlink and points to dir
//   set ENTRIES = []
// else readdir(PREFIX) as ENTRIES
//   If fail, END
//
// with ENTRIES
//   If pattern[n] is GLOBSTAR
//     // handle the case where the globstar match is empty
//     // by pruning it out, and testing the resulting pattern
//     PROCESS(pattern[0..n] + pattern[n+1 .. $], false)
//     // handle other cases.
//     for ENTRY in ENTRIES (not dotfiles)
//       // attach globstar + tail onto the entry
//       // Mark that this entry is a globstar match
//       PROCESS(pattern[0..n] + ENTRY + pattern[n .. $], true)
//
//   else // not globstar
//     for ENTRY in ENTRIES (not dotfiles, unless pattern[n] is dot)
//       Test ENTRY against pattern[n]
//       If fails, continue
//       If passes, PROCESS(pattern[0..n] + item + pattern[n+1 .. $])
//
// Caveat:
//   Cache all stats and readdirs results to minimize syscall.  Since all
//   we ever care about is existence and directory-ness, we can just keep
//   `true` for files, and [children,...] for directories, or `false` for
//   things that don't exist.

module.exports = glob

var fs = require('fs')
var minimatch = require('minimatch')
var Minimatch = minimatch.Minimatch
var inherits = require('inherits')
var EE = require('events').EventEmitter
var path = require('path')
var assert = require('assert')
var isAbsolute = require('path-is-absolute')
var globSync = require('./sync.js')
var common = require('./common.js')
var alphasort = common.alphasort
var alphasorti = common.alphasorti
var setopts = common.setopts
var ownProp = common.ownProp
var inflight = require('inflight')
var util = require('util')
var childrenIgnored = common.childrenIgnored
var isIgnored = common.isIgnored

var once = require('once')

function glob (pattern, options, cb) {
  if (typeof options === 'function') cb = options, options = {}
  if (!options) options = {}

  if (options.sync) {
    if (cb)
      throw new TypeError('callback provided to sync glob')
    return globSync(pattern, options)
  }

  return new Glob(pattern, options, cb)
}

glob.sync = globSync
var GlobSync = glob.GlobSync = globSync.GlobSync

// old api surface
glob.glob = glob

function extend (origin, add) {
  if (add === null || typeof add !== 'object') {
    return origin
  }

  var keys = Object.keys(add)
  var i = keys.length
  while (i--) {
    origin[keys[i]] = add[keys[i]]
  }
  return origin
}

glob.hasMagic = function (pattern, options_) {
  var options = extend({}, options_)
  options.noprocess = true

  var g = new Glob(pattern, options)
  var set = g.minimatch.set
  if (set.length > 1)
    return true

  for (var j = 0; j < set[0].length; j++) {
    if (typeof set[0][j] !== 'string')
      return true
  }

  return false
}

glob.Glob = Glob
inherits(Glob, EE)
function Glob (pattern, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = null
  }

  if (options && options.sync) {
    if (cb)
      throw new TypeError('callback provided to sync glob')
    return new GlobSync(pattern, options)
  }

  if (!(this instanceof Glob))
    return new Glob(pattern, options, cb)

  setopts(this, pattern, options)
  this._didRealPath = false

  // process each pattern in the minimatch set
  var n = this.minimatch.set.length

  // The matches are stored as {<filename>: true,...} so that
  // duplicates are automagically pruned.
  // Later, we do an Object.keys() on these.
  // Keep them as a list so we can fill in when nonull is set.
  this.matches = new Array(n)

  if (typeof cb === 'function') {
    cb = once(cb)
    this.on('error', cb)
    this.on('end', function (matches) {
      cb(null, matches)
    })
  }

  var self = this
  var n = this.minimatch.set.length
  this._processing = 0
  this.matches = new Array(n)

  this._emitQueue = []
  this._processQueue = []
  this.paused = false

  if (this.noprocess)
    return this

  if (n === 0)
    return done()

  for (var i = 0; i < n; i ++) {
    this._process(this.minimatch.set[i], i, false, done)
  }

  function done () {
    --self._processing
    if (self._processing <= 0)
      self._finish()
  }
}

Glob.prototype._finish = function () {
  assert(this instanceof Glob)
  if (this.aborted)
    return

  if (this.realpath && !this._didRealpath)
    return this._realpath()

  common.finish(this)
  this.emit('end', this.found)
}

Glob.prototype._realpath = function () {
  if (this._didRealpath)
    return

  this._didRealpath = true

  var n = this.matches.length
  if (n === 0)
    return this._finish()

  var self = this
  for (var i = 0; i < this.matches.length; i++)
    this._realpathSet(i, next)

  function next () {
    if (--n === 0)
      self._finish()
  }
}

Glob.prototype._realpathSet = function (index, cb) {
  var matchset = this.matches[index]
  if (!matchset)
    return cb()

  var found = Object.keys(matchset)
  var self = this
  var n = found.length

  if (n === 0)
    return cb()

  var set = this.matches[index] = Object.create(null)
  found.forEach(function (p, i) {
    // If there's a problem with the stat, then it means that
    // one or more of the links in the realpath couldn't be
    // resolved.  just return the abs value in that case.
    p = self._makeAbs(p)
    fs.realpath(p, self.realpathCache, function (er, real) {
      if (!er)
        set[real] = true
      else if (er.syscall === 'stat')
        set[p] = true
      else
        self.emit('error', er) // srsly wtf right here

      if (--n === 0) {
        self.matches[index] = set
        cb()
      }
    })
  })
}

Glob.prototype._mark = function (p) {
  return common.mark(this, p)
}

Glob.prototype._makeAbs = function (f) {
  return common.makeAbs(this, f)
}

Glob.prototype.abort = function () {
  this.aborted = true
  this.emit('abort')
}

Glob.prototype.pause = function () {
  if (!this.paused) {
    this.paused = true
    this.emit('pause')
  }
}

Glob.prototype.resume = function () {
  if (this.paused) {
    this.emit('resume')
    this.paused = false
    if (this._emitQueue.length) {
      var eq = this._emitQueue.slice(0)
      this._emitQueue.length = 0
      for (var i = 0; i < eq.length; i ++) {
        var e = eq[i]
        this._emitMatch(e[0], e[1])
      }
    }
    if (this._processQueue.length) {
      var pq = this._processQueue.slice(0)
      this._processQueue.length = 0
      for (var i = 0; i < pq.length; i ++) {
        var p = pq[i]
        this._processing--
        this._process(p[0], p[1], p[2], p[3])
      }
    }
  }
}

Glob.prototype._process = function (pattern, index, inGlobStar, cb) {
  assert(this instanceof Glob)
  assert(typeof cb === 'function')

  if (this.aborted)
    return

  this._processing++
  if (this.paused) {
    this._processQueue.push([pattern, index, inGlobStar, cb])
    return
  }

  //console.error('PROCESS %d', this._processing, pattern)

  // Get the first [n] parts of pattern that are all strings.
  var n = 0
  while (typeof pattern[n] === 'string') {
    n ++
  }
  // now n is the index of the first one that is *not* a string.

  // see if there's anything else
  var prefix
  switch (n) {
    // if not, then this is rather simple
    case pattern.length:
      this._processSimple(pattern.join('/'), index, cb)
      return

    case 0:
      // pattern *starts* with some non-trivial item.
      // going to readdir(cwd), but not include the prefix in matches.
      prefix = null
      break

    default:
      // pattern has some string bits in the front.
      // whatever it starts with, whether that's 'absolute' like /foo/bar,
      // or 'relative' like '../baz'
      prefix = pattern.slice(0, n).join('/')
      break
  }

  var remain = pattern.slice(n)

  // get the list of entries.
  var read
  if (prefix === null)
    read = '.'
  else if (isAbsolute(prefix) || isAbsolute(pattern.join('/'))) {
    if (!prefix || !isAbsolute(prefix))
      prefix = '/' + prefix
    read = prefix
  } else
    read = prefix

  var abs = this._makeAbs(read)

  //if ignored, skip _processing
  if (childrenIgnored(this, read))
    return cb()

  var isGlobStar = remain[0] === minimatch.GLOBSTAR
  if (isGlobStar)
    this._processGlobStar(prefix, read, abs, remain, index, inGlobStar, cb)
  else
    this._processReaddir(prefix, read, abs, remain, index, inGlobStar, cb)
}

Glob.prototype._processReaddir = function (prefix, read, abs, remain, index, inGlobStar, cb) {
  var self = this
  this._readdir(abs, inGlobStar, function (er, entries) {
    return self._processReaddir2(prefix, read, abs, remain, index, inGlobStar, entries, cb)
  })
}

Glob.prototype._processReaddir2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {

  // if the abs isn't a dir, then nothing can match!
  if (!entries)
    return cb()

  // It will only match dot entries if it starts with a dot, or if
  // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
  var pn = remain[0]
  var negate = !!this.minimatch.negate
  var rawGlob = pn._glob
  var dotOk = this.dot || rawGlob.charAt(0) === '.'

  var matchedEntries = []
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    if (e.charAt(0) !== '.' || dotOk) {
      var m
      if (negate && !prefix) {
        m = !e.match(pn)
      } else {
        m = e.match(pn)
      }
      if (m)
        matchedEntries.push(e)
    }
  }

  //console.error('prd2', prefix, entries, remain[0]._glob, matchedEntries)

  var len = matchedEntries.length
  // If there are no matched entries, then nothing matches.
  if (len === 0)
    return cb()

  // if this is the last remaining pattern bit, then no need for
  // an additional stat *unless* the user has specified mark or
  // stat explicitly.  We know they exist, since readdir returned
  // them.

  if (remain.length === 1 && !this.mark && !this.stat) {
    if (!this.matches[index])
      this.matches[index] = Object.create(null)

    for (var i = 0; i < len; i ++) {
      var e = matchedEntries[i]
      if (prefix) {
        if (prefix !== '/')
          e = prefix + '/' + e
        else
          e = prefix + e
      }

      if (e.charAt(0) === '/' && !this.nomount) {
        e = path.join(this.root, e)
      }
      this._emitMatch(index, e)
    }
    // This was the last one, and no stats were needed
    return cb()
  }

  // now test all matched entries as stand-ins for that part
  // of the pattern.
  remain.shift()
  for (var i = 0; i < len; i ++) {
    var e = matchedEntries[i]
    var newPattern
    if (prefix) {
      if (prefix !== '/')
        e = prefix + '/' + e
      else
        e = prefix + e
    }
    this._process([e].concat(remain), index, inGlobStar, cb)
  }
  cb()
}

Glob.prototype._emitMatch = function (index, e) {
  if (this.aborted)
    return

  if (this.matches[index][e])
    return

  if (isIgnored(this, e))
    return

  if (this.paused) {
    this._emitQueue.push([index, e])
    return
  }

  var abs = this._makeAbs(e)

  if (this.nodir) {
    var c = this.cache[abs]
    if (c === 'DIR' || Array.isArray(c))
      return
  }

  if (this.mark)
    e = this._mark(e)

  this.matches[index][e] = true

  var st = this.statCache[abs]
  if (st)
    this.emit('stat', e, st)

  this.emit('match', e)
}

Glob.prototype._readdirInGlobStar = function (abs, cb) {
  if (this.aborted)
    return

  // follow all symlinked directories forever
  // just proceed as if this is a non-globstar situation
  if (this.follow)
    return this._readdir(abs, false, cb)

  var lstatkey = 'lstat\0' + abs
  var self = this
  var lstatcb = inflight(lstatkey, lstatcb_)

  if (lstatcb)
    fs.lstat(abs, lstatcb)

  function lstatcb_ (er, lstat) {
    if (er)
      return cb()

    var isSym = lstat.isSymbolicLink()
    self.symlinks[abs] = isSym

    // If it's not a symlink or a dir, then it's definitely a regular file.
    // don't bother doing a readdir in that case.
    if (!isSym && !lstat.isDirectory()) {
      self.cache[abs] = 'FILE'
      cb()
    } else
      self._readdir(abs, false, cb)
  }
}

Glob.prototype._readdir = function (abs, inGlobStar, cb) {
  if (this.aborted)
    return

  cb = inflight('readdir\0'+abs+'\0'+inGlobStar, cb)
  if (!cb)
    return

  //console.error('RD %j %j', +inGlobStar, abs)
  if (inGlobStar && !ownProp(this.symlinks, abs))
    return this._readdirInGlobStar(abs, cb)

  if (ownProp(this.cache, abs)) {
    var c = this.cache[abs]
    if (!c || c === 'FILE')
      return cb()

    if (Array.isArray(c))
      return cb(null, c)
  }

  var self = this
  fs.readdir(abs, readdirCb(this, abs, cb))
}

function readdirCb (self, abs, cb) {
  return function (er, entries) {
    if (er)
      self._readdirError(abs, er, cb)
    else
      self._readdirEntries(abs, entries, cb)
  }
}

Glob.prototype._readdirEntries = function (abs, entries, cb) {
  if (this.aborted)
    return

  // if we haven't asked to stat everything, then just
  // assume that everything in there exists, so we can avoid
  // having to stat it a second time.
  if (!this.mark && !this.stat) {
    for (var i = 0; i < entries.length; i ++) {
      var e = entries[i]
      if (abs === '/')
        e = abs + e
      else
        e = abs + '/' + e
      this.cache[e] = true
    }
  }

  this.cache[abs] = entries
  return cb(null, entries)
}

Glob.prototype._readdirError = function (f, er, cb) {
  if (this.aborted)
    return

  // handle errors, and cache the information
  switch (er.code) {
    case 'ENOTSUP': // https://github.com/isaacs/node-glob/issues/205
    case 'ENOTDIR': // totally normal. means it *does* exist.
      this.cache[this._makeAbs(f)] = 'FILE'
      if (f === this.cwd) {
        var error = new Error(er.code + ' invalid cwd ' + f)
        error.path = f
        error.code = er.code
        this.emit('error', error)
        this.abort()
      }
      break

    case 'ENOENT': // not terribly unusual
    case 'ELOOP':
    case 'ENAMETOOLONG':
    case 'UNKNOWN':
      this.cache[this._makeAbs(f)] = false
      break

    default: // some unusual error.  Treat as failure.
      this.cache[this._makeAbs(f)] = false
      if (this.strict) {
        this.emit('error', er)
        // If the error is handled, then we abort
        // if not, we threw out of here
        this.abort()
      }
      if (!this.silent)
        console.error('glob error', er)
      break
  }

  return cb()
}

Glob.prototype._processGlobStar = function (prefix, read, abs, remain, index, inGlobStar, cb) {
  var self = this
  this._readdir(abs, inGlobStar, function (er, entries) {
    self._processGlobStar2(prefix, read, abs, remain, index, inGlobStar, entries, cb)
  })
}


Glob.prototype._processGlobStar2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {
  //console.error('pgs2', prefix, remain[0], entries)

  // no entries means not a dir, so it can never have matches
  // foo.txt/** doesn't match foo.txt
  if (!entries)
    return cb()

  // test without the globstar, and with every child both below
  // and replacing the globstar.
  var remainWithoutGlobStar = remain.slice(1)
  var gspref = prefix ? [ prefix ] : []
  var noGlobStar = gspref.concat(remainWithoutGlobStar)

  // the noGlobStar pattern exits the inGlobStar state
  this._process(noGlobStar, index, false, cb)

  var isSym = this.symlinks[abs]
  var len = entries.length

  // If it's a symlink, and we're in a globstar, then stop
  if (isSym && inGlobStar)
    return cb()

  for (var i = 0; i < len; i++) {
    var e = entries[i]
    if (e.charAt(0) === '.' && !this.dot)
      continue

    // these two cases enter the inGlobStar state
    var instead = gspref.concat(entries[i], remainWithoutGlobStar)
    this._process(instead, index, true, cb)

    var below = gspref.concat(entries[i], remain)
    this._process(below, index, true, cb)
  }

  cb()
}

Glob.prototype._processSimple = function (prefix, index, cb) {
  // XXX review this.  Shouldn't it be doing the mounting etc
  // before doing stat?  kinda weird?
  var self = this
  this._stat(prefix, function (er, exists) {
    self._processSimple2(prefix, index, er, exists, cb)
  })
}
Glob.prototype._processSimple2 = function (prefix, index, er, exists, cb) {

  //console.error('ps2', prefix, exists)

  if (!this.matches[index])
    this.matches[index] = Object.create(null)

  // If it doesn't exist, then just mark the lack of results
  if (!exists)
    return cb()

  if (prefix && isAbsolute(prefix) && !this.nomount) {
    var trail = /[\/\\]$/.test(prefix)
    if (prefix.charAt(0) === '/') {
      prefix = path.join(this.root, prefix)
    } else {
      prefix = path.resolve(this.root, prefix)
      if (trail)
        prefix += '/'
    }
  }

  if (process.platform === 'win32')
    prefix = prefix.replace(/\\/g, '/')

  // Mark this as a match
  this._emitMatch(index, prefix)
  cb()
}

// Returns either 'DIR', 'FILE', or false
Glob.prototype._stat = function (f, cb) {
  var abs = this._makeAbs(f)
  var needDir = f.slice(-1) === '/'

  if (f.length > this.maxLength)
    return cb()

  if (!this.stat && ownProp(this.cache, abs)) {
    var c = this.cache[abs]

    if (Array.isArray(c))
      c = 'DIR'

    // It exists, but maybe not how we need it
    if (!needDir || c === 'DIR')
      return cb(null, c)

    if (needDir && c === 'FILE')
      return cb()

    // otherwise we have to stat, because maybe c=true
    // if we know it exists, but not what it is.
  }

  var exists
  var stat = this.statCache[abs]
  if (stat !== undefined) {
    if (stat === false)
      return cb(null, stat)
    else {
      var type = stat.isDirectory() ? 'DIR' : 'FILE'
      if (needDir && type === 'FILE')
        return cb()
      else
        return cb(null, type, stat)
    }
  }

  var self = this
  var statcb = inflight('stat\0' + abs, lstatcb_)
  if (statcb)
    fs.lstat(abs, statcb)

  function lstatcb_ (er, lstat) {
    if (lstat && lstat.isSymbolicLink()) {
      // If it's a symlink, then treat it as the target, unless
      // the target does not exist, then treat it as a file.
      return fs.stat(abs, function (er, stat) {
        if (er)
          self._stat2(f, abs, null, lstat, cb)
        else
          self._stat2(f, abs, er, stat, cb)
      })
    } else {
      self._stat2(f, abs, er, lstat, cb)
    }
  }
}

Glob.prototype._stat2 = function (f, abs, er, stat, cb) {
  if (er) {
    this.statCache[abs] = false
    return cb()
  }

  var needDir = f.slice(-1) === '/'
  this.statCache[abs] = stat

  if (abs.slice(-1) === '/' && !stat.isDirectory())
    return cb(null, false, stat)

  var c = stat.isDirectory() ? 'DIR' : 'FILE'
  this.cache[abs] = this.cache[abs] || c

  if (needDir && c !== 'DIR')
    return cb()

  return cb(null, c, stat)
}

},{"./common.js":22,"./sync.js":33,"assert":undefined,"events":undefined,"fs":undefined,"inflight":24,"inherits":20,"minimatch":26,"once":31,"path":undefined,"path-is-absolute":32,"util":undefined}],24:[function(require,module,exports){
var wrappy = require('wrappy')
var reqs = Object.create(null)
var once = require('once')

module.exports = wrappy(inflight)

function inflight (key, cb) {
  if (reqs[key]) {
    reqs[key].push(cb)
    return null
  } else {
    reqs[key] = [cb]
    return makeres(key)
  }
}

function makeres (key) {
  return once(function RES () {
    var cbs = reqs[key]
    var len = cbs.length
    var args = slice(arguments)
    for (var i = 0; i < len; i++) {
      cbs[i].apply(null, args)
    }
    if (cbs.length > len) {
      // added more in the interim.
      // de-zalgo, just in case, but don't call again.
      cbs.splice(0, len)
      process.nextTick(function () {
        RES.apply(null, args)
      })
    } else {
      delete reqs[key]
    }
  })
}

function slice (args) {
  var length = args.length
  var array = []

  for (var i = 0; i < length; i++) array[i] = args[i]
  return array
}

},{"once":31,"wrappy":25}],25:[function(require,module,exports){
// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}

},{}],26:[function(require,module,exports){
module.exports = minimatch
minimatch.Minimatch = Minimatch

var path = { sep: '/' }
try {
  path = require('path')
} catch (er) {}

var GLOBSTAR = minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {}
var expand = require('brace-expansion')

// any single thing other than /
// don't need to escape / when using new RegExp()
var qmark = '[^/]'

// * => any number of characters
var star = qmark + '*?'

// ** when dots are allowed.  Anything goes, except .. and .
// not (^ or / followed by one or two dots followed by $ or /),
// followed by anything, any number of times.
var twoStarDot = '(?:(?!(?:\\\/|^)(?:\\.{1,2})($|\\\/)).)*?'

// not a ^ or / followed by a dot,
// followed by anything, any number of times.
var twoStarNoDot = '(?:(?!(?:\\\/|^)\\.).)*?'

// characters that need to be escaped in RegExp.
var reSpecials = charSet('().*{}+?[]^$\\!')

// "abc" -> { a:true, b:true, c:true }
function charSet (s) {
  return s.split('').reduce(function (set, c) {
    set[c] = true
    return set
  }, {})
}

// normalizes slashes.
var slashSplit = /\/+/

minimatch.filter = filter
function filter (pattern, options) {
  options = options || {}
  return function (p, i, list) {
    return minimatch(p, pattern, options)
  }
}

function ext (a, b) {
  a = a || {}
  b = b || {}
  var t = {}
  Object.keys(b).forEach(function (k) {
    t[k] = b[k]
  })
  Object.keys(a).forEach(function (k) {
    t[k] = a[k]
  })
  return t
}

minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return minimatch

  var orig = minimatch

  var m = function minimatch (p, pattern, options) {
    return orig.minimatch(p, pattern, ext(def, options))
  }

  m.Minimatch = function Minimatch (pattern, options) {
    return new orig.Minimatch(pattern, ext(def, options))
  }

  return m
}

Minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return Minimatch
  return minimatch.defaults(def).Minimatch
}

function minimatch (p, pattern, options) {
  if (typeof pattern !== 'string') {
    throw new TypeError('glob pattern string required')
  }

  if (!options) options = {}

  // shortcut: comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === '#') {
    return false
  }

  // "" only matches ""
  if (pattern.trim() === '') return p === ''

  return new Minimatch(pattern, options).match(p)
}

function Minimatch (pattern, options) {
  if (!(this instanceof Minimatch)) {
    return new Minimatch(pattern, options)
  }

  if (typeof pattern !== 'string') {
    throw new TypeError('glob pattern string required')
  }

  if (!options) options = {}
  pattern = pattern.trim()

  // windows support: need to use /, not \
  if (path.sep !== '/') {
    pattern = pattern.split(path.sep).join('/')
  }

  this.options = options
  this.set = []
  this.pattern = pattern
  this.regexp = null
  this.negate = false
  this.comment = false
  this.empty = false

  // make the set of regexps etc.
  this.make()
}

Minimatch.prototype.debug = function () {}

Minimatch.prototype.make = make
function make () {
  // don't do it more than once.
  if (this._made) return

  var pattern = this.pattern
  var options = this.options

  // empty patterns and comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === '#') {
    this.comment = true
    return
  }
  if (!pattern) {
    this.empty = true
    return
  }

  // step 1: figure out negation, etc.
  this.parseNegate()

  // step 2: expand braces
  var set = this.globSet = this.braceExpand()

  if (options.debug) this.debug = console.error

  this.debug(this.pattern, set)

  // step 3: now we have a set, so turn each one into a series of path-portion
  // matching patterns.
  // These will be regexps, except in the case of "**", which is
  // set to the GLOBSTAR object for globstar behavior,
  // and will not contain any / characters
  set = this.globParts = set.map(function (s) {
    return s.split(slashSplit)
  })

  this.debug(this.pattern, set)

  // glob --> regexps
  set = set.map(function (s, si, set) {
    return s.map(this.parse, this)
  }, this)

  this.debug(this.pattern, set)

  // filter out everything that didn't compile properly.
  set = set.filter(function (s) {
    return s.indexOf(false) === -1
  })

  this.debug(this.pattern, set)

  this.set = set
}

Minimatch.prototype.parseNegate = parseNegate
function parseNegate () {
  var pattern = this.pattern
  var negate = false
  var options = this.options
  var negateOffset = 0

  if (options.nonegate) return

  for (var i = 0, l = pattern.length
    ; i < l && pattern.charAt(i) === '!'
    ; i++) {
    negate = !negate
    negateOffset++
  }

  if (negateOffset) this.pattern = pattern.substr(negateOffset)
  this.negate = negate
}

// Brace expansion:
// a{b,c}d -> abd acd
// a{b,}c -> abc ac
// a{0..3}d -> a0d a1d a2d a3d
// a{b,c{d,e}f}g -> abg acdfg acefg
// a{b,c}d{e,f}g -> abdeg acdeg abdeg abdfg
//
// Invalid sets are not expanded.
// a{2..}b -> a{2..}b
// a{b}c -> a{b}c
minimatch.braceExpand = function (pattern, options) {
  return braceExpand(pattern, options)
}

Minimatch.prototype.braceExpand = braceExpand

function braceExpand (pattern, options) {
  if (!options) {
    if (this instanceof Minimatch) {
      options = this.options
    } else {
      options = {}
    }
  }

  pattern = typeof pattern === 'undefined'
    ? this.pattern : pattern

  if (typeof pattern === 'undefined') {
    throw new Error('undefined pattern')
  }

  if (options.nobrace ||
    !pattern.match(/\{.*\}/)) {
    // shortcut. no need to expand.
    return [pattern]
  }

  return expand(pattern)
}

// parse a component of the expanded set.
// At this point, no pattern may contain "/" in it
// so we're going to return a 2d array, where each entry is the full
// pattern, split on '/', and then turned into a regular expression.
// A regexp is made at the end which joins each array with an
// escaped /, and another full one which joins each regexp with |.
//
// Following the lead of Bash 4.1, note that "**" only has special meaning
// when it is the *only* thing in a path portion.  Otherwise, any series
// of * is equivalent to a single *.  Globstar behavior is enabled by
// default, and can be disabled by setting options.noglobstar.
Minimatch.prototype.parse = parse
var SUBPARSE = {}
function parse (pattern, isSub) {
  var options = this.options

  // shortcuts
  if (!options.noglobstar && pattern === '**') return GLOBSTAR
  if (pattern === '') return ''

  var re = ''
  var hasMagic = !!options.nocase
  var escaping = false
  // ? => one single character
  var patternListStack = []
  var negativeLists = []
  var plType
  var stateChar
  var inClass = false
  var reClassStart = -1
  var classStart = -1
  // . and .. never match anything that doesn't start with .,
  // even when options.dot is set.
  var patternStart = pattern.charAt(0) === '.' ? '' // anything
  // not (start or / followed by . or .. followed by / or end)
  : options.dot ? '(?!(?:^|\\\/)\\.{1,2}(?:$|\\\/))'
  : '(?!\\.)'
  var self = this

  function clearStateChar () {
    if (stateChar) {
      // we had some state-tracking character
      // that wasn't consumed by this pass.
      switch (stateChar) {
        case '*':
          re += star
          hasMagic = true
        break
        case '?':
          re += qmark
          hasMagic = true
        break
        default:
          re += '\\' + stateChar
        break
      }
      self.debug('clearStateChar %j %j', stateChar, re)
      stateChar = false
    }
  }

  for (var i = 0, len = pattern.length, c
    ; (i < len) && (c = pattern.charAt(i))
    ; i++) {
    this.debug('%s\t%s %s %j', pattern, i, re, c)

    // skip over any that are escaped.
    if (escaping && reSpecials[c]) {
      re += '\\' + c
      escaping = false
      continue
    }

    switch (c) {
      case '/':
        // completely not allowed, even escaped.
        // Should already be path-split by now.
        return false

      case '\\':
        clearStateChar()
        escaping = true
      continue

      // the various stateChar values
      // for the "extglob" stuff.
      case '?':
      case '*':
      case '+':
      case '@':
      case '!':
        this.debug('%s\t%s %s %j <-- stateChar', pattern, i, re, c)

        // all of those are literals inside a class, except that
        // the glob [!a] means [^a] in regexp
        if (inClass) {
          this.debug('  in class')
          if (c === '!' && i === classStart + 1) c = '^'
          re += c
          continue
        }

        // if we already have a stateChar, then it means
        // that there was something like ** or +? in there.
        // Handle the stateChar, then proceed with this one.
        self.debug('call clearStateChar %j', stateChar)
        clearStateChar()
        stateChar = c
        // if extglob is disabled, then +(asdf|foo) isn't a thing.
        // just clear the statechar *now*, rather than even diving into
        // the patternList stuff.
        if (options.noext) clearStateChar()
      continue

      case '(':
        if (inClass) {
          re += '('
          continue
        }

        if (!stateChar) {
          re += '\\('
          continue
        }

        plType = stateChar
        patternListStack.push({
          type: plType,
          start: i - 1,
          reStart: re.length
        })
        // negation is (?:(?!js)[^/]*)
        re += stateChar === '!' ? '(?:(?!(?:' : '(?:'
        this.debug('plType %j %j', stateChar, re)
        stateChar = false
      continue

      case ')':
        if (inClass || !patternListStack.length) {
          re += '\\)'
          continue
        }

        clearStateChar()
        hasMagic = true
        re += ')'
        var pl = patternListStack.pop()
        plType = pl.type
        // negation is (?:(?!js)[^/]*)
        // The others are (?:<pattern>)<type>
        switch (plType) {
          case '!':
            negativeLists.push(pl)
            re += ')[^/]*?)'
            pl.reEnd = re.length
            break
          case '?':
          case '+':
          case '*':
            re += plType
            break
          case '@': break // the default anyway
        }
      continue

      case '|':
        if (inClass || !patternListStack.length || escaping) {
          re += '\\|'
          escaping = false
          continue
        }

        clearStateChar()
        re += '|'
      continue

      // these are mostly the same in regexp and glob
      case '[':
        // swallow any state-tracking char before the [
        clearStateChar()

        if (inClass) {
          re += '\\' + c
          continue
        }

        inClass = true
        classStart = i
        reClassStart = re.length
        re += c
      continue

      case ']':
        //  a right bracket shall lose its special
        //  meaning and represent itself in
        //  a bracket expression if it occurs
        //  first in the list.  -- POSIX.2 2.8.3.2
        if (i === classStart + 1 || !inClass) {
          re += '\\' + c
          escaping = false
          continue
        }

        // handle the case where we left a class open.
        // "[z-a]" is valid, equivalent to "\[z-a\]"
        if (inClass) {
          // split where the last [ was, make sure we don't have
          // an invalid re. if so, re-walk the contents of the
          // would-be class to re-translate any characters that
          // were passed through as-is
          // TODO: It would probably be faster to determine this
          // without a try/catch and a new RegExp, but it's tricky
          // to do safely.  For now, this is safe and works.
          var cs = pattern.substring(classStart + 1, i)
          try {
            RegExp('[' + cs + ']')
          } catch (er) {
            // not a valid class!
            var sp = this.parse(cs, SUBPARSE)
            re = re.substr(0, reClassStart) + '\\[' + sp[0] + '\\]'
            hasMagic = hasMagic || sp[1]
            inClass = false
            continue
          }
        }

        // finish up the class.
        hasMagic = true
        inClass = false
        re += c
      continue

      default:
        // swallow any state char that wasn't consumed
        clearStateChar()

        if (escaping) {
          // no need
          escaping = false
        } else if (reSpecials[c]
          && !(c === '^' && inClass)) {
          re += '\\'
        }

        re += c

    } // switch
  } // for

  // handle the case where we left a class open.
  // "[abc" is valid, equivalent to "\[abc"
  if (inClass) {
    // split where the last [ was, and escape it
    // this is a huge pita.  We now have to re-walk
    // the contents of the would-be class to re-translate
    // any characters that were passed through as-is
    cs = pattern.substr(classStart + 1)
    sp = this.parse(cs, SUBPARSE)
    re = re.substr(0, reClassStart) + '\\[' + sp[0]
    hasMagic = hasMagic || sp[1]
  }

  // handle the case where we had a +( thing at the *end*
  // of the pattern.
  // each pattern list stack adds 3 chars, and we need to go through
  // and escape any | chars that were passed through as-is for the regexp.
  // Go through and escape them, taking care not to double-escape any
  // | chars that were already escaped.
  for (pl = patternListStack.pop(); pl; pl = patternListStack.pop()) {
    var tail = re.slice(pl.reStart + 3)
    // maybe some even number of \, then maybe 1 \, followed by a |
    tail = tail.replace(/((?:\\{2})*)(\\?)\|/g, function (_, $1, $2) {
      if (!$2) {
        // the | isn't already escaped, so escape it.
        $2 = '\\'
      }

      // need to escape all those slashes *again*, without escaping the
      // one that we need for escaping the | character.  As it works out,
      // escaping an even number of slashes can be done by simply repeating
      // it exactly after itself.  That's why this trick works.
      //
      // I am sorry that you have to see this.
      return $1 + $1 + $2 + '|'
    })

    this.debug('tail=%j\n   %s', tail, tail)
    var t = pl.type === '*' ? star
      : pl.type === '?' ? qmark
      : '\\' + pl.type

    hasMagic = true
    re = re.slice(0, pl.reStart) + t + '\\(' + tail
  }

  // handle trailing things that only matter at the very end.
  clearStateChar()
  if (escaping) {
    // trailing \\
    re += '\\\\'
  }

  // only need to apply the nodot start if the re starts with
  // something that could conceivably capture a dot
  var addPatternStart = false
  switch (re.charAt(0)) {
    case '.':
    case '[':
    case '(': addPatternStart = true
  }

  // Hack to work around lack of negative lookbehind in JS
  // A pattern like: *.!(x).!(y|z) needs to ensure that a name
  // like 'a.xyz.yz' doesn't match.  So, the first negative
  // lookahead, has to look ALL the way ahead, to the end of
  // the pattern.
  for (var n = negativeLists.length - 1; n > -1; n--) {
    var nl = negativeLists[n]

    var nlBefore = re.slice(0, nl.reStart)
    var nlFirst = re.slice(nl.reStart, nl.reEnd - 8)
    var nlLast = re.slice(nl.reEnd - 8, nl.reEnd)
    var nlAfter = re.slice(nl.reEnd)

    nlLast += nlAfter

    // Handle nested stuff like *(*.js|!(*.json)), where open parens
    // mean that we should *not* include the ) in the bit that is considered
    // "after" the negated section.
    var openParensBefore = nlBefore.split('(').length - 1
    var cleanAfter = nlAfter
    for (i = 0; i < openParensBefore; i++) {
      cleanAfter = cleanAfter.replace(/\)[+*?]?/, '')
    }
    nlAfter = cleanAfter

    var dollar = ''
    if (nlAfter === '' && isSub !== SUBPARSE) {
      dollar = '$'
    }
    var newRe = nlBefore + nlFirst + nlAfter + dollar + nlLast
    re = newRe
  }

  // if the re is not "" at this point, then we need to make sure
  // it doesn't match against an empty path part.
  // Otherwise a/* will match a/, which it should not.
  if (re !== '' && hasMagic) {
    re = '(?=.)' + re
  }

  if (addPatternStart) {
    re = patternStart + re
  }

  // parsing just a piece of a larger pattern.
  if (isSub === SUBPARSE) {
    return [re, hasMagic]
  }

  // skip the regexp for non-magical patterns
  // unescape anything in it, though, so that it'll be
  // an exact match against a file etc.
  if (!hasMagic) {
    return globUnescape(pattern)
  }

  var flags = options.nocase ? 'i' : ''
  var regExp = new RegExp('^' + re + '$', flags)

  regExp._glob = pattern
  regExp._src = re

  return regExp
}

minimatch.makeRe = function (pattern, options) {
  return new Minimatch(pattern, options || {}).makeRe()
}

Minimatch.prototype.makeRe = makeRe
function makeRe () {
  if (this.regexp || this.regexp === false) return this.regexp

  // at this point, this.set is a 2d array of partial
  // pattern strings, or "**".
  //
  // It's better to use .match().  This function shouldn't
  // be used, really, but it's pretty convenient sometimes,
  // when you just want to work with a regex.
  var set = this.set

  if (!set.length) {
    this.regexp = false
    return this.regexp
  }
  var options = this.options

  var twoStar = options.noglobstar ? star
    : options.dot ? twoStarDot
    : twoStarNoDot
  var flags = options.nocase ? 'i' : ''

  var re = set.map(function (pattern) {
    return pattern.map(function (p) {
      return (p === GLOBSTAR) ? twoStar
      : (typeof p === 'string') ? regExpEscape(p)
      : p._src
    }).join('\\\/')
  }).join('|')

  // must match entire pattern
  // ending in a * or ** will make it less strict.
  re = '^(?:' + re + ')$'

  // can match anything, as long as it's not this.
  if (this.negate) re = '^(?!' + re + ').*$'

  try {
    this.regexp = new RegExp(re, flags)
  } catch (ex) {
    this.regexp = false
  }
  return this.regexp
}

minimatch.match = function (list, pattern, options) {
  options = options || {}
  var mm = new Minimatch(pattern, options)
  list = list.filter(function (f) {
    return mm.match(f)
  })
  if (mm.options.nonull && !list.length) {
    list.push(pattern)
  }
  return list
}

Minimatch.prototype.match = match
function match (f, partial) {
  this.debug('match', f, this.pattern)
  // short-circuit in the case of busted things.
  // comments, etc.
  if (this.comment) return false
  if (this.empty) return f === ''

  if (f === '/' && partial) return true

  var options = this.options

  // windows: need to use /, not \
  if (path.sep !== '/') {
    f = f.split(path.sep).join('/')
  }

  // treat the test path as a set of pathparts.
  f = f.split(slashSplit)
  this.debug(this.pattern, 'split', f)

  // just ONE of the pattern sets in this.set needs to match
  // in order for it to be valid.  If negating, then just one
  // match means that we have failed.
  // Either way, return on the first hit.

  var set = this.set
  this.debug(this.pattern, 'set', set)

  // Find the basename of the path by looking for the last non-empty segment
  var filename
  var i
  for (i = f.length - 1; i >= 0; i--) {
    filename = f[i]
    if (filename) break
  }

  for (i = 0; i < set.length; i++) {
    var pattern = set[i]
    var file = f
    if (options.matchBase && pattern.length === 1) {
      file = [filename]
    }
    var hit = this.matchOne(file, pattern, partial)
    if (hit) {
      if (options.flipNegate) return true
      return !this.negate
    }
  }

  // didn't get any hits.  this is success if it's a negative
  // pattern, failure otherwise.
  if (options.flipNegate) return false
  return this.negate
}

// set partial to true to test if, for example,
// "/a/b" matches the start of "/*/b/*/d"
// Partial means, if you run out of file before you run
// out of pattern, then that's fine, as long as all
// the parts match.
Minimatch.prototype.matchOne = function (file, pattern, partial) {
  var options = this.options

  this.debug('matchOne',
    { 'this': this, file: file, pattern: pattern })

  this.debug('matchOne', file.length, pattern.length)

  for (var fi = 0,
      pi = 0,
      fl = file.length,
      pl = pattern.length
      ; (fi < fl) && (pi < pl)
      ; fi++, pi++) {
    this.debug('matchOne loop')
    var p = pattern[pi]
    var f = file[fi]

    this.debug(pattern, p, f)

    // should be impossible.
    // some invalid regexp stuff in the set.
    if (p === false) return false

    if (p === GLOBSTAR) {
      this.debug('GLOBSTAR', [pattern, p, f])

      // "**"
      // a/**/b/**/c would match the following:
      // a/b/x/y/z/c
      // a/x/y/z/b/c
      // a/b/x/b/x/c
      // a/b/c
      // To do this, take the rest of the pattern after
      // the **, and see if it would match the file remainder.
      // If so, return success.
      // If not, the ** "swallows" a segment, and try again.
      // This is recursively awful.
      //
      // a/**/b/**/c matching a/b/x/y/z/c
      // - a matches a
      // - doublestar
      //   - matchOne(b/x/y/z/c, b/**/c)
      //     - b matches b
      //     - doublestar
      //       - matchOne(x/y/z/c, c) -> no
      //       - matchOne(y/z/c, c) -> no
      //       - matchOne(z/c, c) -> no
      //       - matchOne(c, c) yes, hit
      var fr = fi
      var pr = pi + 1
      if (pr === pl) {
        this.debug('** at the end')
        // a ** at the end will just swallow the rest.
        // We have found a match.
        // however, it will not swallow /.x, unless
        // options.dot is set.
        // . and .. are *never* matched by **, for explosively
        // exponential reasons.
        for (; fi < fl; fi++) {
          if (file[fi] === '.' || file[fi] === '..' ||
            (!options.dot && file[fi].charAt(0) === '.')) return false
        }
        return true
      }

      // ok, let's see if we can swallow whatever we can.
      while (fr < fl) {
        var swallowee = file[fr]

        this.debug('\nglobstar while', file, fr, pattern, pr, swallowee)

        // XXX remove this slice.  Just pass the start index.
        if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
          this.debug('globstar found match!', fr, fl, swallowee)
          // found a match.
          return true
        } else {
          // can't swallow "." or ".." ever.
          // can only swallow ".foo" when explicitly asked.
          if (swallowee === '.' || swallowee === '..' ||
            (!options.dot && swallowee.charAt(0) === '.')) {
            this.debug('dot detected!', file, fr, pattern, pr)
            break
          }

          // ** swallows a segment, and continue.
          this.debug('globstar swallow a segment, and continue')
          fr++
        }
      }

      // no match was found.
      // However, in partial mode, we can't say this is necessarily over.
      // If there's more *pattern* left, then
      if (partial) {
        // ran out of file
        this.debug('\n>>> no match, partial?', file, fr, pattern, pr)
        if (fr === fl) return true
      }
      return false
    }

    // something other than **
    // non-magic patterns just have to match exactly
    // patterns with magic have been turned into regexps.
    var hit
    if (typeof p === 'string') {
      if (options.nocase) {
        hit = f.toLowerCase() === p.toLowerCase()
      } else {
        hit = f === p
      }
      this.debug('string match', p, f, hit)
    } else {
      hit = f.match(p)
      this.debug('pattern match', p, f, hit)
    }

    if (!hit) return false
  }

  // Note: ending in / means that we'll get a final ""
  // at the end of the pattern.  This can only match a
  // corresponding "" at the end of the file.
  // If the file ends in /, then it can only match a
  // a pattern that ends in /, unless the pattern just
  // doesn't have any more for it. But, a/b/ should *not*
  // match "a/b/*", even though "" matches against the
  // [^/]*? pattern, except in partial mode, where it might
  // simply not be reached yet.
  // However, a/b/ should still satisfy a/*

  // now either we fell off the end of the pattern, or we're done.
  if (fi === fl && pi === pl) {
    // ran out of pattern and filename at the same time.
    // an exact hit!
    return true
  } else if (fi === fl) {
    // ran out of file, but still had pattern left.
    // this is ok if we're doing the match as part of
    // a glob fs traversal.
    return partial
  } else if (pi === pl) {
    // ran out of pattern, still have file left.
    // this is only acceptable if we're on the very last
    // empty segment of a file with a trailing slash.
    // a/* should match a/b/
    var emptyFileEnd = (fi === fl - 1) && (file[fi] === '')
    return emptyFileEnd
  }

  // should be unreachable.
  throw new Error('wtf?')
}

// replace stuff like \* with *
function globUnescape (s) {
  return s.replace(/\\(.)/g, '$1')
}

function regExpEscape (s) {
  return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}

},{"brace-expansion":27,"path":undefined}],27:[function(require,module,exports){
var concatMap = require('concat-map');
var balanced = require('balanced-match');

module.exports = expandTop;

var escSlash = '\0SLASH'+Math.random()+'\0';
var escOpen = '\0OPEN'+Math.random()+'\0';
var escClose = '\0CLOSE'+Math.random()+'\0';
var escComma = '\0COMMA'+Math.random()+'\0';
var escPeriod = '\0PERIOD'+Math.random()+'\0';

function numeric(str) {
  return parseInt(str, 10) == str
    ? parseInt(str, 10)
    : str.charCodeAt(0);
}

function escapeBraces(str) {
  return str.split('\\\\').join(escSlash)
            .split('\\{').join(escOpen)
            .split('\\}').join(escClose)
            .split('\\,').join(escComma)
            .split('\\.').join(escPeriod);
}

function unescapeBraces(str) {
  return str.split(escSlash).join('\\')
            .split(escOpen).join('{')
            .split(escClose).join('}')
            .split(escComma).join(',')
            .split(escPeriod).join('.');
}


// Basically just str.split(","), but handling cases
// where we have nested braced sections, which should be
// treated as individual members, like {a,{b,c},d}
function parseCommaParts(str) {
  if (!str)
    return [''];

  var parts = [];
  var m = balanced('{', '}', str);

  if (!m)
    return str.split(',');

  var pre = m.pre;
  var body = m.body;
  var post = m.post;
  var p = pre.split(',');

  p[p.length-1] += '{' + body + '}';
  var postParts = parseCommaParts(post);
  if (post.length) {
    p[p.length-1] += postParts.shift();
    p.push.apply(p, postParts);
  }

  parts.push.apply(parts, p);

  return parts;
}

function expandTop(str) {
  if (!str)
    return [];

  return expand(escapeBraces(str), true).map(unescapeBraces);
}

function identity(e) {
  return e;
}

function embrace(str) {
  return '{' + str + '}';
}
function isPadded(el) {
  return /^-?0\d/.test(el);
}

function lte(i, y) {
  return i <= y;
}
function gte(i, y) {
  return i >= y;
}

function expand(str, isTop) {
  var expansions = [];

  var m = balanced('{', '}', str);
  if (!m || /\$$/.test(m.pre)) return [str];

  var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
  var isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
  var isSequence = isNumericSequence || isAlphaSequence;
  var isOptions = /^(.*,)+(.+)?$/.test(m.body);
  if (!isSequence && !isOptions) {
    // {a},b}
    if (m.post.match(/,.*\}/)) {
      str = m.pre + '{' + m.body + escClose + m.post;
      return expand(str);
    }
    return [str];
  }

  var n;
  if (isSequence) {
    n = m.body.split(/\.\./);
  } else {
    n = parseCommaParts(m.body);
    if (n.length === 1) {
      // x{{a,b}}y ==> x{a}y x{b}y
      n = expand(n[0], false).map(embrace);
      if (n.length === 1) {
        var post = m.post.length
          ? expand(m.post, false)
          : [''];
        return post.map(function(p) {
          return m.pre + n[0] + p;
        });
      }
    }
  }

  // at this point, n is the parts, and we know it's not a comma set
  // with a single entry.

  // no need to expand pre, since it is guaranteed to be free of brace-sets
  var pre = m.pre;
  var post = m.post.length
    ? expand(m.post, false)
    : [''];

  var N;

  if (isSequence) {
    var x = numeric(n[0]);
    var y = numeric(n[1]);
    var width = Math.max(n[0].length, n[1].length)
    var incr = n.length == 3
      ? Math.abs(numeric(n[2]))
      : 1;
    var test = lte;
    var reverse = y < x;
    if (reverse) {
      incr *= -1;
      test = gte;
    }
    var pad = n.some(isPadded);

    N = [];

    for (var i = x; test(i, y); i += incr) {
      var c;
      if (isAlphaSequence) {
        c = String.fromCharCode(i);
        if (c === '\\')
          c = '';
      } else {
        c = String(i);
        if (pad) {
          var need = width - c.length;
          if (need > 0) {
            var z = new Array(need + 1).join('0');
            if (i < 0)
              c = '-' + z + c.slice(1);
            else
              c = z + c;
          }
        }
      }
      N.push(c);
    }
  } else {
    N = concatMap(n, function(el) { return expand(el, false) });
  }

  for (var j = 0; j < N.length; j++) {
    for (var k = 0; k < post.length; k++) {
      var expansion = pre + N[j] + post[k];
      if (!isTop || isSequence || expansion)
        expansions.push(expansion);
    }
  }

  return expansions;
}


},{"balanced-match":28,"concat-map":29}],28:[function(require,module,exports){
module.exports = balanced;
function balanced(a, b, str) {
  var r = range(a, b, str);

  return r && {
    start: r[0],
    end: r[1],
    pre: str.slice(0, r[0]),
    body: str.slice(r[0] + a.length, r[1]),
    post: str.slice(r[1] + b.length)
  };
}

balanced.range = range;
function range(a, b, str) {
  var begs, beg, left, right, result;
  var ai = str.indexOf(a);
  var bi = str.indexOf(b, ai + 1);
  var i = ai;

  if (ai >= 0 && bi > 0) {
    begs = [];
    left = str.length;

    while (i < str.length && i >= 0 && ! result) {
      if (i == ai) {
        begs.push(i);
        ai = str.indexOf(a, i + 1);
      } else if (begs.length == 1) {
        result = [ begs.pop(), bi ];
      } else {
        beg = begs.pop();
        if (beg < left) {
          left = beg;
          right = bi;
        }

        bi = str.indexOf(b, i + 1);
      }

      i = ai < bi && ai >= 0 ? ai : bi;
    }

    if (begs.length) {
      result = [ left, right ];
    }
  }

  return result;
}

},{}],29:[function(require,module,exports){
module.exports = function (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        var x = fn(xs[i], i);
        if (isArray(x)) res.push.apply(res, x);
        else res.push(x);
    }
    return res;
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],30:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"dup":25}],31:[function(require,module,exports){
var wrappy = require('wrappy')
module.exports = wrappy(once)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

},{"wrappy":30}],32:[function(require,module,exports){
'use strict';

function posix(path) {
  return path.charAt(0) === '/';
};

function win32(path) {
  // https://github.com/joyent/node/blob/b3fcc245fb25539909ef1d5eaa01dbf92e168633/lib/path.js#L56
  var splitDeviceRe = /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/;
  var result = splitDeviceRe.exec(path);
  var device = result[1] || '';
  var isUnc = !!device && device.charAt(1) !== ':';

  // UNC paths are always absolute
  return !!result[2] || isUnc;
};

module.exports = process.platform === 'win32' ? win32 : posix;
module.exports.posix = posix;
module.exports.win32 = win32;

},{}],33:[function(require,module,exports){
module.exports = globSync
globSync.GlobSync = GlobSync

var fs = require('fs')
var minimatch = require('minimatch')
var Minimatch = minimatch.Minimatch
var Glob = require('./glob.js').Glob
var util = require('util')
var path = require('path')
var assert = require('assert')
var isAbsolute = require('path-is-absolute')
var common = require('./common.js')
var alphasort = common.alphasort
var alphasorti = common.alphasorti
var setopts = common.setopts
var ownProp = common.ownProp
var childrenIgnored = common.childrenIgnored

function globSync (pattern, options) {
  if (typeof options === 'function' || arguments.length === 3)
    throw new TypeError('callback provided to sync glob\n'+
                        'See: https://github.com/isaacs/node-glob/issues/167')

  return new GlobSync(pattern, options).found
}

function GlobSync (pattern, options) {
  if (!pattern)
    throw new Error('must provide pattern')

  if (typeof options === 'function' || arguments.length === 3)
    throw new TypeError('callback provided to sync glob\n'+
                        'See: https://github.com/isaacs/node-glob/issues/167')

  if (!(this instanceof GlobSync))
    return new GlobSync(pattern, options)

  setopts(this, pattern, options)

  if (this.noprocess)
    return this

  var n = this.minimatch.set.length
  this.matches = new Array(n)
  for (var i = 0; i < n; i ++) {
    this._process(this.minimatch.set[i], i, false)
  }
  this._finish()
}

GlobSync.prototype._finish = function () {
  assert(this instanceof GlobSync)
  if (this.realpath) {
    var self = this
    this.matches.forEach(function (matchset, index) {
      var set = self.matches[index] = Object.create(null)
      for (var p in matchset) {
        try {
          p = self._makeAbs(p)
          var real = fs.realpathSync(p, self.realpathCache)
          set[real] = true
        } catch (er) {
          if (er.syscall === 'stat')
            set[self._makeAbs(p)] = true
          else
            throw er
        }
      }
    })
  }
  common.finish(this)
}


GlobSync.prototype._process = function (pattern, index, inGlobStar) {
  assert(this instanceof GlobSync)

  // Get the first [n] parts of pattern that are all strings.
  var n = 0
  while (typeof pattern[n] === 'string') {
    n ++
  }
  // now n is the index of the first one that is *not* a string.

  // See if there's anything else
  var prefix
  switch (n) {
    // if not, then this is rather simple
    case pattern.length:
      this._processSimple(pattern.join('/'), index)
      return

    case 0:
      // pattern *starts* with some non-trivial item.
      // going to readdir(cwd), but not include the prefix in matches.
      prefix = null
      break

    default:
      // pattern has some string bits in the front.
      // whatever it starts with, whether that's 'absolute' like /foo/bar,
      // or 'relative' like '../baz'
      prefix = pattern.slice(0, n).join('/')
      break
  }

  var remain = pattern.slice(n)

  // get the list of entries.
  var read
  if (prefix === null)
    read = '.'
  else if (isAbsolute(prefix) || isAbsolute(pattern.join('/'))) {
    if (!prefix || !isAbsolute(prefix))
      prefix = '/' + prefix
    read = prefix
  } else
    read = prefix

  var abs = this._makeAbs(read)

  //if ignored, skip processing
  if (childrenIgnored(this, read))
    return

  var isGlobStar = remain[0] === minimatch.GLOBSTAR
  if (isGlobStar)
    this._processGlobStar(prefix, read, abs, remain, index, inGlobStar)
  else
    this._processReaddir(prefix, read, abs, remain, index, inGlobStar)
}


GlobSync.prototype._processReaddir = function (prefix, read, abs, remain, index, inGlobStar) {
  var entries = this._readdir(abs, inGlobStar)

  // if the abs isn't a dir, then nothing can match!
  if (!entries)
    return

  // It will only match dot entries if it starts with a dot, or if
  // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
  var pn = remain[0]
  var negate = !!this.minimatch.negate
  var rawGlob = pn._glob
  var dotOk = this.dot || rawGlob.charAt(0) === '.'

  var matchedEntries = []
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    if (e.charAt(0) !== '.' || dotOk) {
      var m
      if (negate && !prefix) {
        m = !e.match(pn)
      } else {
        m = e.match(pn)
      }
      if (m)
        matchedEntries.push(e)
    }
  }

  var len = matchedEntries.length
  // If there are no matched entries, then nothing matches.
  if (len === 0)
    return

  // if this is the last remaining pattern bit, then no need for
  // an additional stat *unless* the user has specified mark or
  // stat explicitly.  We know they exist, since readdir returned
  // them.

  if (remain.length === 1 && !this.mark && !this.stat) {
    if (!this.matches[index])
      this.matches[index] = Object.create(null)

    for (var i = 0; i < len; i ++) {
      var e = matchedEntries[i]
      if (prefix) {
        if (prefix.slice(-1) !== '/')
          e = prefix + '/' + e
        else
          e = prefix + e
      }

      if (e.charAt(0) === '/' && !this.nomount) {
        e = path.join(this.root, e)
      }
      this.matches[index][e] = true
    }
    // This was the last one, and no stats were needed
    return
  }

  // now test all matched entries as stand-ins for that part
  // of the pattern.
  remain.shift()
  for (var i = 0; i < len; i ++) {
    var e = matchedEntries[i]
    var newPattern
    if (prefix)
      newPattern = [prefix, e]
    else
      newPattern = [e]
    this._process(newPattern.concat(remain), index, inGlobStar)
  }
}


GlobSync.prototype._emitMatch = function (index, e) {
  var abs = this._makeAbs(e)
  if (this.mark)
    e = this._mark(e)

  if (this.matches[index][e])
    return

  if (this.nodir) {
    var c = this.cache[this._makeAbs(e)]
    if (c === 'DIR' || Array.isArray(c))
      return
  }

  this.matches[index][e] = true
  if (this.stat)
    this._stat(e)
}


GlobSync.prototype._readdirInGlobStar = function (abs) {
  // follow all symlinked directories forever
  // just proceed as if this is a non-globstar situation
  if (this.follow)
    return this._readdir(abs, false)

  var entries
  var lstat
  var stat
  try {
    lstat = fs.lstatSync(abs)
  } catch (er) {
    // lstat failed, doesn't exist
    return null
  }

  var isSym = lstat.isSymbolicLink()
  this.symlinks[abs] = isSym

  // If it's not a symlink or a dir, then it's definitely a regular file.
  // don't bother doing a readdir in that case.
  if (!isSym && !lstat.isDirectory())
    this.cache[abs] = 'FILE'
  else
    entries = this._readdir(abs, false)

  return entries
}

GlobSync.prototype._readdir = function (abs, inGlobStar) {
  var entries

  if (inGlobStar && !ownProp(this.symlinks, abs))
    return this._readdirInGlobStar(abs)

  if (ownProp(this.cache, abs)) {
    var c = this.cache[abs]
    if (!c || c === 'FILE')
      return null

    if (Array.isArray(c))
      return c
  }

  try {
    return this._readdirEntries(abs, fs.readdirSync(abs))
  } catch (er) {
    this._readdirError(abs, er)
    return null
  }
}

GlobSync.prototype._readdirEntries = function (abs, entries) {
  // if we haven't asked to stat everything, then just
  // assume that everything in there exists, so we can avoid
  // having to stat it a second time.
  if (!this.mark && !this.stat) {
    for (var i = 0; i < entries.length; i ++) {
      var e = entries[i]
      if (abs === '/')
        e = abs + e
      else
        e = abs + '/' + e
      this.cache[e] = true
    }
  }

  this.cache[abs] = entries

  // mark and cache dir-ness
  return entries
}

GlobSync.prototype._readdirError = function (f, er) {
  // handle errors, and cache the information
  switch (er.code) {
    case 'ENOTSUP': // https://github.com/isaacs/node-glob/issues/205
    case 'ENOTDIR': // totally normal. means it *does* exist.
      this.cache[this._makeAbs(f)] = 'FILE'
      if (f === this.cwd) {
        var error = new Error(er.code + ' invalid cwd ' + f)
        error.path = f
        error.code = er.code
        throw error
      }
      break

    case 'ENOENT': // not terribly unusual
    case 'ELOOP':
    case 'ENAMETOOLONG':
    case 'UNKNOWN':
      this.cache[this._makeAbs(f)] = false
      break

    default: // some unusual error.  Treat as failure.
      this.cache[this._makeAbs(f)] = false
      if (this.strict)
        throw er
      if (!this.silent)
        console.error('glob error', er)
      break
  }
}

GlobSync.prototype._processGlobStar = function (prefix, read, abs, remain, index, inGlobStar) {

  var entries = this._readdir(abs, inGlobStar)

  // no entries means not a dir, so it can never have matches
  // foo.txt/** doesn't match foo.txt
  if (!entries)
    return

  // test without the globstar, and with every child both below
  // and replacing the globstar.
  var remainWithoutGlobStar = remain.slice(1)
  var gspref = prefix ? [ prefix ] : []
  var noGlobStar = gspref.concat(remainWithoutGlobStar)

  // the noGlobStar pattern exits the inGlobStar state
  this._process(noGlobStar, index, false)

  var len = entries.length
  var isSym = this.symlinks[abs]

  // If it's a symlink, and we're in a globstar, then stop
  if (isSym && inGlobStar)
    return

  for (var i = 0; i < len; i++) {
    var e = entries[i]
    if (e.charAt(0) === '.' && !this.dot)
      continue

    // these two cases enter the inGlobStar state
    var instead = gspref.concat(entries[i], remainWithoutGlobStar)
    this._process(instead, index, true)

    var below = gspref.concat(entries[i], remain)
    this._process(below, index, true)
  }
}

GlobSync.prototype._processSimple = function (prefix, index) {
  // XXX review this.  Shouldn't it be doing the mounting etc
  // before doing stat?  kinda weird?
  var exists = this._stat(prefix)

  if (!this.matches[index])
    this.matches[index] = Object.create(null)

  // If it doesn't exist, then just mark the lack of results
  if (!exists)
    return

  if (prefix && isAbsolute(prefix) && !this.nomount) {
    var trail = /[\/\\]$/.test(prefix)
    if (prefix.charAt(0) === '/') {
      prefix = path.join(this.root, prefix)
    } else {
      prefix = path.resolve(this.root, prefix)
      if (trail)
        prefix += '/'
    }
  }

  if (process.platform === 'win32')
    prefix = prefix.replace(/\\/g, '/')

  // Mark this as a match
  this.matches[index][prefix] = true
}

// Returns either 'DIR', 'FILE', or false
GlobSync.prototype._stat = function (f) {
  var abs = this._makeAbs(f)
  var needDir = f.slice(-1) === '/'

  if (f.length > this.maxLength)
    return false

  if (!this.stat && ownProp(this.cache, abs)) {
    var c = this.cache[abs]

    if (Array.isArray(c))
      c = 'DIR'

    // It exists, but maybe not how we need it
    if (!needDir || c === 'DIR')
      return c

    if (needDir && c === 'FILE')
      return false

    // otherwise we have to stat, because maybe c=true
    // if we know it exists, but not what it is.
  }

  var exists
  var stat = this.statCache[abs]
  if (!stat) {
    var lstat
    try {
      lstat = fs.lstatSync(abs)
    } catch (er) {
      return false
    }

    if (lstat.isSymbolicLink()) {
      try {
        stat = fs.statSync(abs)
      } catch (er) {
        stat = lstat
      }
    } else {
      stat = lstat
    }
  }

  this.statCache[abs] = stat

  var c = stat.isDirectory() ? 'DIR' : 'FILE'
  this.cache[abs] = this.cache[abs] || c

  if (needDir && c !== 'DIR')
    return false

  return c
}

GlobSync.prototype._mark = function (p) {
  return common.mark(this, p)
}

GlobSync.prototype._makeAbs = function (f) {
  return common.makeAbs(this, f)
}

},{"./common.js":22,"./glob.js":23,"assert":undefined,"fs":undefined,"minimatch":26,"path":undefined,"path-is-absolute":32,"util":undefined}],34:[function(require,module,exports){
module.exports = rimraf
rimraf.sync = rimrafSync

var assert = require("assert")
var path = require("path")
var fs = require("fs")
var glob = require("glob")

var defaultGlobOpts = {
  nosort: true,
  silent: true
}

// for EMFILE handling
var timeout = 0

var isWindows = (process.platform === "win32")

function defaults (options) {
  var methods = [
    'unlink',
    'chmod',
    'stat',
    'lstat',
    'rmdir',
    'readdir'
  ]
  methods.forEach(function(m) {
    options[m] = options[m] || fs[m]
    m = m + 'Sync'
    options[m] = options[m] || fs[m]
  })

  options.maxBusyTries = options.maxBusyTries || 3
  options.emfileWait = options.emfileWait || 1000
  if (options.glob === false) {
    options.disableGlob = true
  }
  options.disableGlob = options.disableGlob || false
  options.glob = options.glob || defaultGlobOpts
}

function rimraf (p, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }

  assert(p, 'rimraf: missing path')
  assert.equal(typeof p, 'string', 'rimraf: path should be a string')
  assert(options, 'rimraf: missing options')
  assert.equal(typeof options, 'object', 'rimraf: options should be object')
  assert.equal(typeof cb, 'function', 'rimraf: callback function required')

  defaults(options)

  var busyTries = 0
  var errState = null
  var n = 0

  if (options.disableGlob || !glob.hasMagic(p))
    return afterGlob(null, [p])

  fs.lstat(p, function (er, stat) {
    if (!er)
      return afterGlob(null, [p])

    glob(p, options.glob, afterGlob)
  })

  function next (er) {
    errState = errState || er
    if (--n === 0)
      cb(errState)
  }

  function afterGlob (er, results) {
    if (er)
      return cb(er)

    n = results.length
    if (n === 0)
      return cb()

    results.forEach(function (p) {
      rimraf_(p, options, function CB (er) {
        if (er) {
          if (isWindows && (er.code === "EBUSY" || er.code === "ENOTEMPTY" || er.code === "EPERM") &&
              busyTries < options.maxBusyTries) {
            busyTries ++
            var time = busyTries * 100
            // try again, with the same exact callback as this one.
            return setTimeout(function () {
              rimraf_(p, options, CB)
            }, time)
          }

          // this one won't happen if graceful-fs is used.
          if (er.code === "EMFILE" && timeout < options.emfileWait) {
            return setTimeout(function () {
              rimraf_(p, options, CB)
            }, timeout ++)
          }

          // already gone
          if (er.code === "ENOENT") er = null
        }

        timeout = 0
        next(er)
      })
    })
  }
}

// Two possible strategies.
// 1. Assume it's a file.  unlink it, then do the dir stuff on EPERM or EISDIR
// 2. Assume it's a directory.  readdir, then do the file stuff on ENOTDIR
//
// Both result in an extra syscall when you guess wrong.  However, there
// are likely far more normal files in the world than directories.  This
// is based on the assumption that a the average number of files per
// directory is >= 1.
//
// If anyone ever complains about this, then I guess the strategy could
// be made configurable somehow.  But until then, YAGNI.
function rimraf_ (p, options, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  // sunos lets the root user unlink directories, which is... weird.
  // so we have to lstat here and make sure it's not a dir.
  options.lstat(p, function (er, st) {
    if (er && er.code === "ENOENT")
      return cb(null)

    if (st && st.isDirectory())
      return rmdir(p, options, er, cb)

    options.unlink(p, function (er) {
      if (er) {
        if (er.code === "ENOENT")
          return cb(null)
        if (er.code === "EPERM")
          return (isWindows)
            ? fixWinEPERM(p, options, er, cb)
            : rmdir(p, options, er, cb)
        if (er.code === "EISDIR")
          return rmdir(p, options, er, cb)
      }
      return cb(er)
    })
  })
}

function fixWinEPERM (p, options, er, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')
  if (er)
    assert(er instanceof Error)

  options.chmod(p, 666, function (er2) {
    if (er2)
      cb(er2.code === "ENOENT" ? null : er)
    else
      options.stat(p, function(er3, stats) {
        if (er3)
          cb(er3.code === "ENOENT" ? null : er)
        else if (stats.isDirectory())
          rmdir(p, options, er, cb)
        else
          options.unlink(p, cb)
      })
  })
}

function fixWinEPERMSync (p, options, er) {
  assert(p)
  assert(options)
  if (er)
    assert(er instanceof Error)

  try {
    options.chmodSync(p, 666)
  } catch (er2) {
    if (er2.code === "ENOENT")
      return
    else
      throw er
  }

  try {
    var stats = options.statSync(p)
  } catch (er3) {
    if (er3.code === "ENOENT")
      return
    else
      throw er
  }

  if (stats.isDirectory())
    rmdirSync(p, options, er)
  else
    options.unlinkSync(p)
}

function rmdir (p, options, originalEr, cb) {
  assert(p)
  assert(options)
  if (originalEr)
    assert(originalEr instanceof Error)
  assert(typeof cb === 'function')

  // try to rmdir first, and only readdir on ENOTEMPTY or EEXIST (SunOS)
  // if we guessed wrong, and it's not a directory, then
  // raise the original error.
  options.rmdir(p, function (er) {
    if (er && (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM"))
      rmkids(p, options, cb)
    else if (er && er.code === "ENOTDIR")
      cb(originalEr)
    else
      cb(er)
  })
}

function rmkids(p, options, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  options.readdir(p, function (er, files) {
    if (er)
      return cb(er)
    var n = files.length
    if (n === 0)
      return options.rmdir(p, cb)
    var errState
    files.forEach(function (f) {
      rimraf(path.join(p, f), options, function (er) {
        if (errState)
          return
        if (er)
          return cb(errState = er)
        if (--n === 0)
          options.rmdir(p, cb)
      })
    })
  })
}

// this looks simpler, and is strictly *faster*, but will
// tie up the JavaScript thread and fail on excessively
// deep directory trees.
function rimrafSync (p, options) {
  options = options || {}
  defaults(options)

  assert(p, 'rimraf: missing path')
  assert.equal(typeof p, 'string', 'rimraf: path should be a string')
  assert(options, 'rimraf: missing options')
  assert.equal(typeof options, 'object', 'rimraf: options should be object')

  var results

  if (options.disableGlob || !glob.hasMagic(p)) {
    results = [p]
  } else {
    try {
      fs.lstatSync(p)
      results = [p]
    } catch (er) {
      results = glob.sync(p, options.glob)
    }
  }

  if (!results.length)
    return

  for (var i = 0; i < results.length; i++) {
    var p = results[i]

    try {
      var st = options.lstatSync(p)
    } catch (er) {
      if (er.code === "ENOENT")
        return
    }

    try {
      // sunos lets the root user unlink directories, which is... weird.
      if (st && st.isDirectory())
        rmdirSync(p, options, null)
      else
        options.unlinkSync(p)
    } catch (er) {
      if (er.code === "ENOENT")
        return
      if (er.code === "EPERM")
        return isWindows ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er)
      if (er.code !== "EISDIR")
        throw er
      rmdirSync(p, options, er)
    }
  }
}

function rmdirSync (p, options, originalEr) {
  assert(p)
  assert(options)
  if (originalEr)
    assert(originalEr instanceof Error)

  try {
    options.rmdirSync(p)
  } catch (er) {
    if (er.code === "ENOENT")
      return
    if (er.code === "ENOTDIR")
      throw originalEr
    if (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM")
      rmkidsSync(p, options)
  }
}

function rmkidsSync (p, options) {
  assert(p)
  assert(options)
  options.readdirSync(p).forEach(function (f) {
    rimrafSync(path.join(p, f), options)
  })
  options.rmdirSync(p, options)
}

},{"assert":undefined,"fs":undefined,"glob":23,"path":undefined}]},{},[1])(1)























, // comma to separate arguments

/*tar*/ (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// just like the Entry class, but it buffers the contents
//
// XXX It would be good to set a maximum BufferEntry filesize,
// since it eats up memory.  In normal operation,
// these are only for long filenames or link names, which are
// rarely very big.

module.exports = BufferEntry

var inherits = require("inherits")
  , Entry = require("./entry.js")

function BufferEntry () {
  Entry.apply(this, arguments)
  this._buffer = new Buffer(this.props.size)
  this._offset = 0
  this.body = ""
  this.on("end", function () {
    this.body = this._buffer.toString().slice(0, -1)
  })
}

inherits(BufferEntry, Entry)

// collect the bytes as they come in.
BufferEntry.prototype.write = function (c) {
  c.copy(this._buffer, this._offset)
  this._offset += c.length
  Entry.prototype.write.call(this, c)
}

},{"./entry.js":3,"inherits":45}],2:[function(require,module,exports){
module.exports = EntryWriter

var tar = require("../tar.js")
  , TarHeader = require("./header.js")
  , Entry = require("./entry.js")
  , inherits = require("inherits")
  , BlockStream = require("block-stream")
  , ExtendedHeaderWriter
  , Stream = require("stream").Stream
  , EOF = {}

inherits(EntryWriter, Stream)

function EntryWriter (props) {
  var me = this

  if (!(me instanceof EntryWriter)) {
    return new EntryWriter(props)
  }

  Stream.apply(this)

  me.writable = true
  me.readable = true

  me._stream = new BlockStream(512)

  me._stream.on("data", function (c) {
    me.emit("data", c)
  })

  me._stream.on("drain", function () {
    me.emit("drain")
  })

  me._stream.on("end", function () {
    me.emit("end")
    me.emit("close")
  })

  me.props = props
  if (props.type === "Directory") {
    props.size = 0
  }
  props.ustar = "ustar\0"
  props.ustarver = "00"
  me.path = props.path

  me._buffer = []
  me._didHeader = false
  me._meta = false

  me.on("pipe", function () {
    me._process()
  })
}

EntryWriter.prototype.write = function (c) {
  // console.error(".. ew write")
  if (this._ended) return this.emit("error", new Error("write after end"))
  this._buffer.push(c)
  this._process()
  this._needDrain = this._buffer.length > 0
  return !this._needDrain
}

EntryWriter.prototype.end = function (c) {
  // console.error(".. ew end")
  if (c) this._buffer.push(c)
  this._buffer.push(EOF)
  this._ended = true
  this._process()
  this._needDrain = this._buffer.length > 0
}

EntryWriter.prototype.pause = function () {
  // console.error(".. ew pause")
  this._paused = true
  this.emit("pause")
}

EntryWriter.prototype.resume = function () {
  // console.error(".. ew resume")
  this._paused = false
  this.emit("resume")
  this._process()
}

EntryWriter.prototype.add = function (entry) {
  // console.error(".. ew add")
  if (!this.parent) return this.emit("error", new Error("no parent"))

  // make sure that the _header and such is emitted, and clear out
  // the _currentEntry link on the parent.
  if (!this._ended) this.end()

  return this.parent.add(entry)
}

EntryWriter.prototype._header = function () {
  // console.error(".. ew header")
  if (this._didHeader) return
  this._didHeader = true

  var headerBlock = TarHeader.encode(this.props)

  if (this.props.needExtended && !this._meta) {
    var me = this

    ExtendedHeaderWriter = ExtendedHeaderWriter ||
      require("./extended-header-writer.js")

    ExtendedHeaderWriter(this.props)
      .on("data", function (c) {
        me.emit("data", c)
      })
      .on("error", function (er) {
        me.emit("error", er)
      })
      .end()
  }

  // console.error(".. .. ew headerBlock emitting")
  this.emit("data", headerBlock)
  this.emit("header")
}

EntryWriter.prototype._process = function () {
  // console.error(".. .. ew process")
  if (!this._didHeader && !this._meta) {
    this._header()
  }

  if (this._paused || this._processing) {
    // console.error(".. .. .. paused=%j, processing=%j", this._paused, this._processing)
    return
  }

  this._processing = true

  var buf = this._buffer
  for (var i = 0; i < buf.length; i ++) {
    // console.error(".. .. .. i=%d", i)

    var c = buf[i]

    if (c === EOF) this._stream.end()
    else this._stream.write(c)

    if (this._paused) {
      // console.error(".. .. .. paused mid-emission")
      this._processing = false
      if (i < buf.length) {
        this._needDrain = true
        this._buffer = buf.slice(i + 1)
      }
      return
    }
  }

  // console.error(".. .. .. emitted")
  this._buffer.length = 0
  this._processing = false

  // console.error(".. .. .. emitting drain")
  this.emit("drain")
}

EntryWriter.prototype.destroy = function () {}

},{"../tar.js":46,"./entry.js":3,"./extended-header-writer.js":4,"./header.js":8,"block-stream":11,"inherits":45,"stream":undefined}],3:[function(require,module,exports){
// A passthrough read/write stream that sets its properties
// based on a header, extendedHeader, and globalHeader
//
// Can be either a file system object of some sort, or
// a pax/ustar metadata entry.

module.exports = Entry

var TarHeader = require("./header.js")
  , tar = require("../tar")
  , assert = require("assert").ok
  , Stream = require("stream").Stream
  , inherits = require("inherits")
  , fstream = require("fstream").Abstract

function Entry (header, extended, global) {
  Stream.call(this)
  this.readable = true
  this.writable = true

  this._needDrain = false
  this._paused = false
  this._reading = false
  this._ending = false
  this._ended = false
  this._remaining = 0
  this._abort = false
  this._queue = []
  this._index = 0
  this._queueLen = 0

  this._read = this._read.bind(this)

  this.props = {}
  this._header = header
  this._extended = extended || {}

  // globals can change throughout the course of
  // a file parse operation.  Freeze it at its current state.
  this._global = {}
  var me = this
  Object.keys(global || {}).forEach(function (g) {
    me._global[g] = global[g]
  })

  this._setProps()
}

inherits(Entry, Stream)

Entry.prototype.write = function (c) {
  if (this._ending) this.error("write() after end()", null, true)
  if (this._remaining === 0) {
    this.error("invalid bytes past eof")
  }

  // often we'll get a bunch of \0 at the end of the last write,
  // since chunks will always be 512 bytes when reading a tarball.
  if (c.length > this._remaining) {
    c = c.slice(0, this._remaining)
  }
  this._remaining -= c.length

  // put it on the stack.
  var ql = this._queueLen
  this._queue.push(c)
  this._queueLen ++

  this._read()

  // either paused, or buffered
  if (this._paused || ql > 0) {
    this._needDrain = true
    return false
  }

  return true
}

Entry.prototype.end = function (c) {
  if (c) this.write(c)
  this._ending = true
  this._read()
}

Entry.prototype.pause = function () {
  this._paused = true
  this.emit("pause")
}

Entry.prototype.resume = function () {
  // console.error("    Tar Entry resume", this.path)
  this.emit("resume")
  this._paused = false
  this._read()
  return this._queueLen - this._index > 1
}

  // This is bound to the instance
Entry.prototype._read = function () {
  // console.error("    Tar Entry _read", this.path)

  if (this._paused || this._reading || this._ended) return

  // set this flag so that event handlers don't inadvertently
  // get multiple _read() calls running.
  this._reading = true

  // have any data to emit?
  while (this._index < this._queueLen && !this._paused) {
    var chunk = this._queue[this._index ++]
    this.emit("data", chunk)
  }

  // check if we're drained
  if (this._index >= this._queueLen) {
    this._queue.length = this._queueLen = this._index = 0
    if (this._needDrain) {
      this._needDrain = false
      this.emit("drain")
    }
    if (this._ending) {
      this._ended = true
      this.emit("end")
    }
  }

  // if the queue gets too big, then pluck off whatever we can.
  // this should be fairly rare.
  var mql = this._maxQueueLen
  if (this._queueLen > mql && this._index > 0) {
    mql = Math.min(this._index, mql)
    this._index -= mql
    this._queueLen -= mql
    this._queue = this._queue.slice(mql)
  }

  this._reading = false
}

Entry.prototype._setProps = function () {
  // props = extended->global->header->{}
  var header = this._header
    , extended = this._extended
    , global = this._global
    , props = this.props

  // first get the values from the normal header.
  var fields = tar.fields
  for (var f = 0; fields[f] !== null; f ++) {
    var field = fields[f]
      , val = header[field]
    if (typeof val !== "undefined") props[field] = val
  }

  // next, the global header for this file.
  // numeric values, etc, will have already been parsed.
  ;[global, extended].forEach(function (p) {
    Object.keys(p).forEach(function (f) {
      if (typeof p[f] !== "undefined") props[f] = p[f]
    })
  })

  // no nulls allowed in path or linkpath
  ;["path", "linkpath"].forEach(function (p) {
    if (props.hasOwnProperty(p)) {
      props[p] = props[p].split("\0")[0]
    }
  })


  // set date fields to be a proper date
  ;["mtime", "ctime", "atime"].forEach(function (p) {
    if (props.hasOwnProperty(p)) {
      props[p] = new Date(props[p] * 1000)
    }
  })

  // set the type so that we know what kind of file to create
  var type
  switch (tar.types[props.type]) {
    case "OldFile":
    case "ContiguousFile":
      type = "File"
      break

    case "GNUDumpDir":
      type = "Directory"
      break

    case undefined:
      type = "Unknown"
      break

    case "Link":
    case "SymbolicLink":
    case "CharacterDevice":
    case "BlockDevice":
    case "Directory":
    case "FIFO":
    default:
      type = tar.types[props.type]
  }

  this.type = type
  this.path = props.path
  this.size = props.size

  // size is special, since it signals when the file needs to end.
  this._remaining = props.size
}

// the parser may not call write if _abort is true. 
// useful for skipping data from some files quickly.
Entry.prototype.abort = function(){
  this._abort = true
}

Entry.prototype.warn = fstream.warn
Entry.prototype.error = fstream.error

},{"../tar":46,"./header.js":8,"assert":undefined,"fstream":12,"inherits":45,"stream":undefined}],4:[function(require,module,exports){

module.exports = ExtendedHeaderWriter

var inherits = require("inherits")
  , EntryWriter = require("./entry-writer.js")

inherits(ExtendedHeaderWriter, EntryWriter)

var tar = require("../tar.js")
  , path = require("path")
  , TarHeader = require("./header.js")

// props is the props of the thing we need to write an
// extended header for.
// Don't be shy with it.  Just encode everything.
function ExtendedHeaderWriter (props) {
  // console.error(">> ehw ctor")
  var me = this

  if (!(me instanceof ExtendedHeaderWriter)) {
    return new ExtendedHeaderWriter(props)
  }

  me.fields = props

  var p =
    { path : ("PaxHeader" + path.join("/", props.path || ""))
             .replace(/\\/g, "/").substr(0, 100)
    , mode : props.mode || 0666
    , uid : props.uid || 0
    , gid : props.gid || 0
    , size : 0 // will be set later
    , mtime : props.mtime || Date.now() / 1000
    , type : "x"
    , linkpath : ""
    , ustar : "ustar\0"
    , ustarver : "00"
    , uname : props.uname || ""
    , gname : props.gname || ""
    , devmaj : props.devmaj || 0
    , devmin : props.devmin || 0
    }


  EntryWriter.call(me, p)
  // console.error(">> ehw props", me.props)
  me.props = p

  me._meta = true
}

ExtendedHeaderWriter.prototype.end = function () {
  // console.error(">> ehw end")
  var me = this

  if (me._ended) return
  me._ended = true

  me._encodeFields()

  if (me.props.size === 0) {
    // nothing to write!
    me._ready = true
    me._stream.end()
    return
  }

  me._stream.write(TarHeader.encode(me.props))
  me.body.forEach(function (l) {
    me._stream.write(l)
  })
  me._ready = true

  // console.error(">> ehw _process calling end()", me.props)
  this._stream.end()
}

ExtendedHeaderWriter.prototype._encodeFields = function () {
  // console.error(">> ehw _encodeFields")
  this.body = []
  if (this.fields.prefix) {
    this.fields.path = this.fields.prefix + "/" + this.fields.path
    this.fields.prefix = ""
  }
  encodeFields(this.fields, "", this.body, this.fields.noProprietary)
  var me = this
  this.body.forEach(function (l) {
    me.props.size += l.length
  })
}

function encodeFields (fields, prefix, body, nop) {
  // console.error(">> >> ehw encodeFields")
  // "%d %s=%s\n", <length>, <keyword>, <value>
  // The length is a decimal number, and includes itself and the \n
  // Numeric values are decimal strings.

  Object.keys(fields).forEach(function (k) {
    var val = fields[k]
      , numeric = tar.numeric[k]

    if (prefix) k = prefix + "." + k

    // already including NODETAR.type, don't need File=true also
    if (k === fields.type && val === true) return

    switch (k) {
      // don't include anything that's always handled just fine
      // in the normal header, or only meaningful in the context
      // of nodetar
      case "mode":
      case "cksum":
      case "ustar":
      case "ustarver":
      case "prefix":
      case "basename":
      case "dirname":
      case "needExtended":
      case "block":
      case "filter":
        return

      case "rdev":
        if (val === 0) return
        break

      case "nlink":
      case "dev": // Truly a hero among men, Creator of Star!
      case "ino": // Speak his name with reverent awe!  It is:
        k = "SCHILY." + k
        break

      default: break
    }

    if (val && typeof val === "object" &&
        !Buffer.isBuffer(val)) encodeFields(val, k, body, nop)
    else if (val === null || val === undefined) return
    else body.push.apply(body, encodeField(k, val, nop))
  })

  return body
}

function encodeField (k, v, nop) {
  // lowercase keys must be valid, otherwise prefix with
  // "NODETAR."
  if (k.charAt(0) === k.charAt(0).toLowerCase()) {
    var m = k.split(".")[0]
    if (!tar.knownExtended[m]) k = "NODETAR." + k
  }

  // no proprietary
  if (nop && k.charAt(0) !== k.charAt(0).toLowerCase()) {
    return []
  }

  if (typeof val === "number") val = val.toString(10)

  var s = new Buffer(" " + k + "=" + v + "\n")
    , digits = Math.floor(Math.log(s.length) / Math.log(10)) + 1

  // console.error("1 s=%j digits=%j s.length=%d", s.toString(), digits, s.length)

  // if adding that many digits will make it go over that length,
  // then add one to it. For example, if the string is:
  // " foo=bar\n"
  // then that's 9 characters.  With the "9", that bumps the length
  // up to 10.  However, this is invalid:
  // "10 foo=bar\n"
  // but, since that's actually 11 characters, since 10 adds another
  // character to the length, and the length includes the number
  // itself.  In that case, just bump it up again.
  if (s.length + digits >= Math.pow(10, digits)) digits += 1
  // console.error("2 s=%j digits=%j s.length=%d", s.toString(), digits, s.length)

  var len = digits + s.length
  // console.error("3 s=%j digits=%j s.length=%d len=%d", s.toString(), digits, s.length, len)
  var lenBuf = new Buffer("" + len)
  if (lenBuf.length + s.length !== len) {
    throw new Error("Bad length calculation\n"+
                    "len="+len+"\n"+
                    "lenBuf="+JSON.stringify(lenBuf.toString())+"\n"+
                    "lenBuf.length="+lenBuf.length+"\n"+
                    "digits="+digits+"\n"+
                    "s="+JSON.stringify(s.toString())+"\n"+
                    "s.length="+s.length)
  }

  return [lenBuf, s]
}

},{"../tar.js":46,"./entry-writer.js":2,"./header.js":8,"inherits":45,"path":undefined}],5:[function(require,module,exports){
// An Entry consisting of:
//
// "%d %s=%s\n", <length>, <keyword>, <value>
//
// The length is a decimal number, and includes itself and the \n
// \0 does not terminate anything.  Only the length terminates the string.
// Numeric values are decimal strings.

module.exports = ExtendedHeader

var Entry = require("./entry.js")
  , inherits = require("inherits")
  , tar = require("../tar.js")
  , numeric = tar.numeric
  , keyTrans = { "SCHILY.dev": "dev"
               , "SCHILY.ino": "ino"
               , "SCHILY.nlink": "nlink" }

function ExtendedHeader () {
  Entry.apply(this, arguments)
  this.on("data", this._parse)
  this.fields = {}
  this._position = 0
  this._fieldPos = 0
  this._state = SIZE
  this._sizeBuf = []
  this._keyBuf = []
  this._valBuf = []
  this._size = -1
  this._key = ""
}

inherits(ExtendedHeader, Entry)
ExtendedHeader.prototype._parse = parse

var s = 0
  , states = ExtendedHeader.states = {}
  , SIZE = states.SIZE = s++
  , KEY  = states.KEY  = s++
  , VAL  = states.VAL  = s++
  , ERR  = states.ERR  = s++

Object.keys(states).forEach(function (s) {
  states[states[s]] = states[s]
})

states[s] = null

// char code values for comparison
var _0 = "0".charCodeAt(0)
  , _9 = "9".charCodeAt(0)
  , point = ".".charCodeAt(0)
  , a = "a".charCodeAt(0)
  , Z = "Z".charCodeAt(0)
  , a = "a".charCodeAt(0)
  , z = "z".charCodeAt(0)
  , space = " ".charCodeAt(0)
  , eq = "=".charCodeAt(0)
  , cr = "\n".charCodeAt(0)

function parse (c) {
  if (this._state === ERR) return

  for ( var i = 0, l = c.length
      ; i < l
      ; this._position++, this._fieldPos++, i++) {
    // console.error("top of loop, size="+this._size)

    var b = c[i]

    if (this._size >= 0 && this._fieldPos > this._size) {
      error(this, "field exceeds length="+this._size)
      return
    }

    switch (this._state) {
      case ERR: return

      case SIZE:
        // console.error("parsing size, b=%d, rest=%j", b, c.slice(i).toString())
        if (b === space) {
          this._state = KEY
          // this._fieldPos = this._sizeBuf.length
          this._size = parseInt(new Buffer(this._sizeBuf).toString(), 10)
          this._sizeBuf.length = 0
          continue
        }
        if (b < _0 || b > _9) {
          error(this, "expected [" + _0 + ".." + _9 + "], got " + b)
          return
        }
        this._sizeBuf.push(b)
        continue

      case KEY:
        // can be any char except =, not > size.
        if (b === eq) {
          this._state = VAL
          this._key = new Buffer(this._keyBuf).toString()
          if (keyTrans[this._key]) this._key = keyTrans[this._key]
          this._keyBuf.length = 0
          continue
        }
        this._keyBuf.push(b)
        continue

      case VAL:
        // field must end with cr
        if (this._fieldPos === this._size - 1) {
          // console.error("finished with "+this._key)
          if (b !== cr) {
            error(this, "expected \\n at end of field")
            return
          }
          var val = new Buffer(this._valBuf).toString()
          if (numeric[this._key]) {
            val = parseFloat(val)
          }
          this.fields[this._key] = val

          this._valBuf.length = 0
          this._state = SIZE
          this._size = -1
          this._fieldPos = -1
          continue
        }
        this._valBuf.push(b)
        continue
    }
  }
}

function error (me, msg) {
  msg = "invalid header: " + msg
      + "\nposition=" + me._position
      + "\nfield position=" + me._fieldPos

  me.error(msg)
  me.state = ERR
}

},{"../tar.js":46,"./entry.js":3,"inherits":45}],6:[function(require,module,exports){
// give it a tarball and a path, and it'll dump the contents

module.exports = Extract

var tar = require("../tar.js")
  , fstream = require("fstream")
  , inherits = require("inherits")
  , path = require("path")

function Extract (opts) {
  if (!(this instanceof Extract)) return new Extract(opts)
  tar.Parse.apply(this)

  if (typeof opts !== "object") {
    opts = { path: opts }
  }

  // better to drop in cwd? seems more standard.
  opts.path = opts.path || path.resolve("node-tar-extract")
  opts.type = "Directory"
  opts.Directory = true

  // similar to --strip or --strip-components
  opts.strip = +opts.strip
  if (!opts.strip || opts.strip <= 0) opts.strip = 0

  this._fst = fstream.Writer(opts)

  this.pause()
  var me = this

  // Hardlinks in tarballs are relative to the root
  // of the tarball.  So, they need to be resolved against
  // the target directory in order to be created properly.
  me.on("entry", function (entry) {
    // if there's a "strip" argument, then strip off that many
    // path components.
    if (opts.strip) {
      var p = entry.path.split("/").slice(opts.strip).join("/")
      entry.path = entry.props.path = p
      if (entry.linkpath) {
        var lp = entry.linkpath.split("/").slice(opts.strip).join("/")
        entry.linkpath = entry.props.linkpath = lp
      }
    }
    if (entry.type === "Link") {
      entry.linkpath = entry.props.linkpath =
        path.join(opts.path, path.join("/", entry.props.linkpath))
    }

    if (entry.type === "SymbolicLink") {
      var dn = path.dirname(entry.path) || ""
      var linkpath = entry.props.linkpath
      var target = path.resolve(opts.path, dn, linkpath)
      if (target.indexOf(opts.path) !== 0) {
        linkpath = path.join(opts.path, path.join("/", linkpath))
      }
      entry.linkpath = entry.props.linkpath = linkpath
    }
  })

  this._fst.on("ready", function () {
    me.pipe(me._fst, { end: false })
    me.resume()
  })

  this._fst.on('error', function(err) {
    me.emit('error', err)
  })

  this._fst.on('drain', function() {
    me.emit('drain')
  })

  // this._fst.on("end", function () {
  //   console.error("\nEEEE Extract End", me._fst.path)
  // })

  this._fst.on("close", function () {
    // console.error("\nEEEE Extract End", me._fst.path)
    me.emit("finish")
    me.emit("end")
    me.emit("close")
  })
}

inherits(Extract, tar.Parse)

Extract.prototype._streamEnd = function () {
  var me = this
  if (!me._ended || me._entry) me.error("unexpected eof")
  me._fst.end()
  // my .end() is coming later.
}

},{"../tar.js":46,"fstream":12,"inherits":45,"path":undefined}],7:[function(require,module,exports){
module.exports = GlobalHeaderWriter

var ExtendedHeaderWriter = require("./extended-header-writer.js")
  , inherits = require("inherits")

inherits(GlobalHeaderWriter, ExtendedHeaderWriter)

function GlobalHeaderWriter (props) {
  if (!(this instanceof GlobalHeaderWriter)) {
    return new GlobalHeaderWriter(props)
  }
  ExtendedHeaderWriter.call(this, props)
  this.props.type = "g"
}

},{"./extended-header-writer.js":4,"inherits":45}],8:[function(require,module,exports){
// parse a 512-byte header block to a data object, or vice-versa
// If the data won't fit nicely in a simple header, then generate
// the appropriate extended header file, and return that.

module.exports = TarHeader

var tar = require("../tar.js")
  , fields = tar.fields
  , fieldOffs = tar.fieldOffs
  , fieldEnds = tar.fieldEnds
  , fieldSize = tar.fieldSize
  , numeric = tar.numeric
  , assert = require("assert").ok
  , space = " ".charCodeAt(0)
  , slash = "/".charCodeAt(0)
  , bslash = process.platform === "win32" ? "\\".charCodeAt(0) : null

function TarHeader (block) {
  if (!(this instanceof TarHeader)) return new TarHeader(block)
  if (block) this.decode(block)
}

TarHeader.prototype =
  { decode : decode
  , encode: encode
  , calcSum: calcSum
  , checkSum: checkSum
  }

TarHeader.parseNumeric = parseNumeric
TarHeader.encode = encode
TarHeader.decode = decode

// note that this will only do the normal ustar header, not any kind
// of extended posix header file.  If something doesn't fit comfortably,
// then it will set obj.needExtended = true, and set the block to
// the closest approximation.
function encode (obj) {
  if (!obj && !(this instanceof TarHeader)) throw new Error(
    "encode must be called on a TarHeader, or supplied an object")

  obj = obj || this
  var block = obj.block = new Buffer(512)

  // if the object has a "prefix", then that's actually an extension of
  // the path field.
  if (obj.prefix) {
    // console.error("%% header encoding, got a prefix", obj.prefix)
    obj.path = obj.prefix + "/" + obj.path
    // console.error("%% header encoding, prefixed path", obj.path)
    obj.prefix = ""
  }

  obj.needExtended = false

  if (obj.mode) {
    if (typeof obj.mode === "string") obj.mode = parseInt(obj.mode, 8)
    obj.mode = obj.mode & 0777
  }

  for (var f = 0; fields[f] !== null; f ++) {
    var field = fields[f]
      , off = fieldOffs[f]
      , end = fieldEnds[f]
      , ret

    switch (field) {
      case "cksum":
        // special, done below, after all the others
        break

      case "prefix":
        // special, this is an extension of the "path" field.
        // console.error("%% header encoding, skip prefix later")
        break

      case "type":
        // convert from long name to a single char.
        var type = obj.type || "0"
        if (type.length > 1) {
          type = tar.types[obj.type]
          if (!type) type = "0"
        }
        writeText(block, off, end, type)
        break

      case "path":
        // uses the "prefix" field if > 100 bytes, but <= 255
        var pathLen = Buffer.byteLength(obj.path)
          , pathFSize = fieldSize[fields.path]
          , prefFSize = fieldSize[fields.prefix]

        // paths between 100 and 255 should use the prefix field.
        // longer than 255
        if (pathLen > pathFSize &&
            pathLen <= pathFSize + prefFSize) {
          // need to find a slash somewhere in the middle so that
          // path and prefix both fit in their respective fields
          var searchStart = pathLen - 1 - pathFSize
            , searchEnd = prefFSize
            , found = false
            , pathBuf = new Buffer(obj.path)

          for ( var s = searchStart
              ; (s <= searchEnd)
              ; s ++ ) {
            if (pathBuf[s] === slash || pathBuf[s] === bslash) {
              found = s
              break
            }
          }

          if (found !== false) {
            prefix = pathBuf.slice(0, found).toString("utf8")
            path = pathBuf.slice(found + 1).toString("utf8")

            ret = writeText(block, off, end, path)
            off = fieldOffs[fields.prefix]
            end = fieldEnds[fields.prefix]
            // console.error("%% header writing prefix", off, end, prefix)
            ret = writeText(block, off, end, prefix) || ret
            break
          }
        }

        // paths less than 100 chars don't need a prefix
        // and paths longer than 255 need an extended header and will fail
        // on old implementations no matter what we do here.
        // Null out the prefix, and fallthrough to default.
        // console.error("%% header writing no prefix")
        var poff = fieldOffs[fields.prefix]
          , pend = fieldEnds[fields.prefix]
        writeText(block, poff, pend, "")
        // fallthrough

      // all other fields are numeric or text
      default:
        ret = numeric[field]
            ? writeNumeric(block, off, end, obj[field])
            : writeText(block, off, end, obj[field] || "")
        break
    }
    obj.needExtended = obj.needExtended || ret
  }

  var off = fieldOffs[fields.cksum]
    , end = fieldEnds[fields.cksum]

  writeNumeric(block, off, end, calcSum.call(this, block))

  return block
}

// if it's a negative number, or greater than will fit,
// then use write256.
var MAXNUM = { 12: 077777777777
             , 11: 07777777777
             , 8 : 07777777
             , 7 : 0777777 }
function writeNumeric (block, off, end, num) {
  var writeLen = end - off
    , maxNum = MAXNUM[writeLen] || 0

  num = num || 0
  // console.error("  numeric", num)

  if (num instanceof Date ||
      Object.prototype.toString.call(num) === "[object Date]") {
    num = num.getTime() / 1000
  }

  if (num > maxNum || num < 0) {
    write256(block, off, end, num)
    // need an extended header if negative or too big.
    return true
  }

  // god, tar is so annoying
  // if the string is small enough, you should put a space
  // between the octal string and the \0, but if it doesn't
  // fit, then don't.
  var numStr = Math.floor(num).toString(8)
  if (num < MAXNUM[writeLen - 1]) numStr += " "

  // pad with "0" chars
  if (numStr.length < writeLen) {
    numStr = (new Array(writeLen - numStr.length).join("0")) + numStr
  }

  if (numStr.length !== writeLen - 1) {
    throw new Error("invalid length: " + JSON.stringify(numStr) + "\n" +
                    "expected: "+writeLen)
  }
  block.write(numStr, off, writeLen, "utf8")
  block[end - 1] = 0
}

function write256 (block, off, end, num) {
  var buf = block.slice(off, end)
  var positive = num >= 0
  buf[0] = positive ? 0x80 : 0xFF

  // get the number as a base-256 tuple
  if (!positive) num *= -1
  var tuple = []
  do {
    var n = num % 256
    tuple.push(n)
    num = (num - n) / 256
  } while (num)

  var bytes = tuple.length

  var fill = buf.length - bytes
  for (var i = 1; i < fill; i ++) {
    buf[i] = positive ? 0 : 0xFF
  }

  // tuple is a base256 number, with [0] as the *least* significant byte
  // if it's negative, then we need to flip all the bits once we hit the
  // first non-zero bit.  The 2's-complement is (0x100 - n), and the 1's-
  // complement is (0xFF - n).
  var zero = true
  for (i = bytes; i > 0; i --) {
    var byte = tuple[bytes - i]
    if (positive) buf[fill + i] = byte
    else if (zero && byte === 0) buf[fill + i] = 0
    else if (zero) {
      zero = false
      buf[fill + i] = 0x100 - byte
    } else buf[fill + i] = 0xFF - byte
  }
}

function writeText (block, off, end, str) {
  // strings are written as utf8, then padded with \0
  var strLen = Buffer.byteLength(str)
    , writeLen = Math.min(strLen, end - off)
    // non-ascii fields need extended headers
    // long fields get truncated
    , needExtended = strLen !== str.length || strLen > writeLen

  // write the string, and null-pad
  if (writeLen > 0) block.write(str, off, writeLen, "utf8")
  for (var i = off + writeLen; i < end; i ++) block[i] = 0

  return needExtended
}

function calcSum (block) {
  block = block || this.block
  assert(Buffer.isBuffer(block) && block.length === 512)

  if (!block) throw new Error("Need block to checksum")

  // now figure out what it would be if the cksum was "        "
  var sum = 0
    , start = fieldOffs[fields.cksum]
    , end = fieldEnds[fields.cksum]

  for (var i = 0; i < fieldOffs[fields.cksum]; i ++) {
    sum += block[i]
  }

  for (var i = start; i < end; i ++) {
    sum += space
  }

  for (var i = end; i < 512; i ++) {
    sum += block[i]
  }

  return sum
}


function checkSum (block) {
  var sum = calcSum.call(this, block)
  block = block || this.block

  var cksum = block.slice(fieldOffs[fields.cksum], fieldEnds[fields.cksum])
  cksum = parseNumeric(cksum)

  return cksum === sum
}

function decode (block) {
  block = block || this.block
  assert(Buffer.isBuffer(block) && block.length === 512)

  this.block = block
  this.cksumValid = this.checkSum()

  var prefix = null

  // slice off each field.
  for (var f = 0; fields[f] !== null; f ++) {
    var field = fields[f]
      , val = block.slice(fieldOffs[f], fieldEnds[f])

    switch (field) {
      case "ustar":
        // if not ustar, then everything after that is just padding.
        if (val.toString() !== "ustar\0") {
          this.ustar = false
          return
        } else {
          // console.error("ustar:", val, val.toString())
          this.ustar = val.toString()
        }
        break

      // prefix is special, since it might signal the xstar header
      case "prefix":
        var atime = parseNumeric(val.slice(131, 131 + 12))
          , ctime = parseNumeric(val.slice(131 + 12, 131 + 12 + 12))
        if ((val[130] === 0 || val[130] === space) &&
            typeof atime === "number" &&
            typeof ctime === "number" &&
            val[131 + 12] === space &&
            val[131 + 12 + 12] === space) {
          this.atime = atime
          this.ctime = ctime
          val = val.slice(0, 130)
        }
        prefix = val.toString("utf8").replace(/\0+$/, "")
        // console.error("%% header reading prefix", prefix)
        break

      // all other fields are null-padding text
      // or a number.
      default:
        if (numeric[field]) {
          this[field] = parseNumeric(val)
        } else {
          this[field] = val.toString("utf8").replace(/\0+$/, "")
        }
        break
    }
  }

  // if we got a prefix, then prepend it to the path.
  if (prefix) {
    this.path = prefix + "/" + this.path
    // console.error("%% header got a prefix", this.path)
  }
}

function parse256 (buf) {
  // first byte MUST be either 80 or FF
  // 80 for positive, FF for 2's comp
  var positive
  if (buf[0] === 0x80) positive = true
  else if (buf[0] === 0xFF) positive = false
  else return null

  // build up a base-256 tuple from the least sig to the highest
  var zero = false
    , tuple = []
  for (var i = buf.length - 1; i > 0; i --) {
    var byte = buf[i]
    if (positive) tuple.push(byte)
    else if (zero && byte === 0) tuple.push(0)
    else if (zero) {
      zero = false
      tuple.push(0x100 - byte)
    } else tuple.push(0xFF - byte)
  }

  for (var sum = 0, i = 0, l = tuple.length; i < l; i ++) {
    sum += tuple[i] * Math.pow(256, i)
  }

  return positive ? sum : -1 * sum
}

function parseNumeric (f) {
  if (f[0] & 0x80) return parse256(f)

  var str = f.toString("utf8").split("\0")[0].trim()
    , res = parseInt(str, 8)

  return isNaN(res) ? null : res
}


},{"../tar.js":46,"assert":undefined}],9:[function(require,module,exports){
// pipe in an fstream, and it'll make a tarball.
// key-value pair argument is global extended header props.

module.exports = Pack

var EntryWriter = require("./entry-writer.js")
  , Stream = require("stream").Stream
  , path = require("path")
  , inherits = require("inherits")
  , GlobalHeaderWriter = require("./global-header-writer.js")
  , collect = require("fstream").collect
  , eof = new Buffer(512)

for (var i = 0; i < 512; i ++) eof[i] = 0

inherits(Pack, Stream)

function Pack (props) {
  // console.error("-- p ctor")
  var me = this
  if (!(me instanceof Pack)) return new Pack(props)

  if (props) me._noProprietary = props.noProprietary
  else me._noProprietary = false

  me._global = props

  me.readable = true
  me.writable = true
  me._buffer = []
  // console.error("-- -- set current to null in ctor")
  me._currentEntry = null
  me._processing = false

  me._pipeRoot = null
  me.on("pipe", function (src) {
    if (src.root === me._pipeRoot) return
    me._pipeRoot = src
    src.on("end", function () {
      me._pipeRoot = null
    })
    me.add(src)
  })
}

Pack.prototype.addGlobal = function (props) {
  // console.error("-- p addGlobal")
  if (this._didGlobal) return
  this._didGlobal = true

  var me = this
  GlobalHeaderWriter(props)
    .on("data", function (c) {
      me.emit("data", c)
    })
    .end()
}

Pack.prototype.add = function (stream) {
  if (this._global && !this._didGlobal) this.addGlobal(this._global)

  if (this._ended) return this.emit("error", new Error("add after end"))

  collect(stream)
  this._buffer.push(stream)
  this._process()
  this._needDrain = this._buffer.length > 0
  return !this._needDrain
}

Pack.prototype.pause = function () {
  this._paused = true
  if (this._currentEntry) this._currentEntry.pause()
  this.emit("pause")
}

Pack.prototype.resume = function () {
  this._paused = false
  if (this._currentEntry) this._currentEntry.resume()
  this.emit("resume")
  this._process()
}

Pack.prototype.end = function () {
  this._ended = true
  this._buffer.push(eof)
  this._process()
}

Pack.prototype._process = function () {
  var me = this
  if (me._paused || me._processing) {
    return
  }

  var entry = me._buffer.shift()

  if (!entry) {
    if (me._needDrain) {
      me.emit("drain")
    }
    return
  }

  if (entry.ready === false) {
    // console.error("-- entry is not ready", entry)
    me._buffer.unshift(entry)
    entry.on("ready", function () {
      // console.error("-- -- ready!", entry)
      me._process()
    })
    return
  }

  me._processing = true

  if (entry === eof) {
    // need 2 ending null blocks.
    me.emit("data", eof)
    me.emit("data", eof)
    me.emit("end")
    me.emit("close")
    return
  }

  // Change the path to be relative to the root dir that was
  // added to the tarball.
  //
  // XXX This should be more like how -C works, so you can
  // explicitly set a root dir, and also explicitly set a pathname
  // in the tarball to use.  That way we can skip a lot of extra
  // work when resolving symlinks for bundled dependencies in npm.

  var root = path.dirname((entry.root || entry).path);
  if (me._global && me._global.fromBase && entry.root && entry.root.path) {
    // user set 'fromBase: true' indicating tar root should be directory itself
    root = entry.root.path;
  }

  var wprops = {}

  Object.keys(entry.props || {}).forEach(function (k) {
    wprops[k] = entry.props[k]
  })

  if (me._noProprietary) wprops.noProprietary = true

  wprops.path = path.relative(root, entry.path || '')

  // actually not a matter of opinion or taste.
  if (process.platform === "win32") {
    wprops.path = wprops.path.replace(/\\/g, "/")
  }

  if (!wprops.type)
    wprops.type = 'Directory'

  switch (wprops.type) {
    // sockets not supported
    case "Socket":
      return

    case "Directory":
      wprops.path += "/"
      wprops.size = 0
      break

    case "Link":
      var lp = path.resolve(path.dirname(entry.path), entry.linkpath)
      wprops.linkpath = path.relative(root, lp) || "."
      wprops.size = 0
      break

    case "SymbolicLink":
      var lp = path.resolve(path.dirname(entry.path), entry.linkpath)
      wprops.linkpath = path.relative(path.dirname(entry.path), lp) || "."
      wprops.size = 0
      break
  }

  // console.error("-- new writer", wprops)
  // if (!wprops.type) {
  //   // console.error("-- no type?", entry.constructor.name, entry)
  // }

  // console.error("-- -- set current to new writer", wprops.path)
  var writer = me._currentEntry = EntryWriter(wprops)

  writer.parent = me

  // writer.on("end", function () {
  //   // console.error("-- -- writer end", writer.path)
  // })

  writer.on("data", function (c) {
    me.emit("data", c)
  })

  writer.on("header", function () {
    Buffer.prototype.toJSON = function () {
      return this.toString().split(/\0/).join(".")
    }
    // console.error("-- -- writer header %j", writer.props)
    if (writer.props.size === 0) nextEntry()
  })
  writer.on("close", nextEntry)

  var ended = false
  function nextEntry () {
    if (ended) return
    ended = true

    // console.error("-- -- writer close", writer.path)
    // console.error("-- -- set current to null", wprops.path)
    me._currentEntry = null
    me._processing = false
    me._process()
  }

  writer.on("error", function (er) {
    // console.error("-- -- writer error", writer.path)
    me.emit("error", er)
  })

  // if it's the root, then there's no need to add its entries,
  // or data, since they'll be added directly.
  if (entry === me._pipeRoot) {
    // console.error("-- is the root, don't auto-add")
    writer.add = null
  }

  entry.pipe(writer)
}

Pack.prototype.destroy = function () {}
Pack.prototype.write = function () {}

},{"./entry-writer.js":2,"./global-header-writer.js":7,"fstream":12,"inherits":45,"path":undefined,"stream":undefined}],10:[function(require,module,exports){

// A writable stream.
// It emits "entry" events, which provide a readable stream that has
// header info attached.

module.exports = Parse.create = Parse

var stream = require("stream")
  , Stream = stream.Stream
  , BlockStream = require("block-stream")
  , tar = require("../tar.js")
  , TarHeader = require("./header.js")
  , Entry = require("./entry.js")
  , BufferEntry = require("./buffer-entry.js")
  , ExtendedHeader = require("./extended-header.js")
  , assert = require("assert").ok
  , inherits = require("inherits")
  , fstream = require("fstream")

// reading a tar is a lot like reading a directory
// However, we're actually not going to run the ctor,
// since it does a stat and various other stuff.
// This inheritance gives us the pause/resume/pipe
// behavior that is desired.
inherits(Parse, fstream.Reader)

function Parse () {
  var me = this
  if (!(me instanceof Parse)) return new Parse()

  // doesn't apply fstream.Reader ctor?
  // no, becasue we don't want to stat/etc, we just
  // want to get the entry/add logic from .pipe()
  Stream.apply(me)

  me.writable = true
  me.readable = true
  me._stream = new BlockStream(512)
  me.position = 0
  me._ended = false

  me._stream.on("error", function (e) {
    me.emit("error", e)
  })

  me._stream.on("data", function (c) {
    me._process(c)
  })

  me._stream.on("end", function () {
    me._streamEnd()
  })

  me._stream.on("drain", function () {
    me.emit("drain")
  })
}

// overridden in Extract class, since it needs to
// wait for its DirWriter part to finish before
// emitting "end"
Parse.prototype._streamEnd = function () {
  var me = this
  if (!me._ended || me._entry) me.error("unexpected eof")
  me.emit("end")
}

// a tar reader is actually a filter, not just a readable stream.
// So, you should pipe a tarball stream into it, and it needs these
// write/end methods to do that.
Parse.prototype.write = function (c) {
  if (this._ended) {
    // gnutar puts a LOT of nulls at the end.
    // you can keep writing these things forever.
    // Just ignore them.
    for (var i = 0, l = c.length; i > l; i ++) {
      if (c[i] !== 0) return this.error("write() after end()")
    }
    return
  }
  return this._stream.write(c)
}

Parse.prototype.end = function (c) {
  this._ended = true
  return this._stream.end(c)
}

// don't need to do anything, since we're just
// proxying the data up from the _stream.
// Just need to override the parent's "Not Implemented"
// error-thrower.
Parse.prototype._read = function () {}

Parse.prototype._process = function (c) {
  assert(c && c.length === 512, "block size should be 512")

  // one of three cases.
  // 1. A new header
  // 2. A part of a file/extended header
  // 3. One of two or more EOF null blocks

  if (this._entry) {
    var entry = this._entry
    if(!entry._abort) entry.write(c)
    else {
      entry._remaining -= c.length
      if(entry._remaining < 0) entry._remaining = 0
    }
    if (entry._remaining === 0) {
      entry.end()
      this._entry = null
    }
  } else {
    // either zeroes or a header
    var zero = true
    for (var i = 0; i < 512 && zero; i ++) {
      zero = c[i] === 0
    }

    // eof is *at least* 2 blocks of nulls, and then the end of the
    // file.  you can put blocks of nulls between entries anywhere,
    // so appending one tarball to another is technically valid.
    // ending without the eof null blocks is not allowed, however.
    if (zero) {
      if (this._eofStarted)
        this._ended = true
      this._eofStarted = true
    } else {
      this._eofStarted = false
      this._startEntry(c)
    }
  }

  this.position += 512
}

// take a header chunk, start the right kind of entry.
Parse.prototype._startEntry = function (c) {
  var header = new TarHeader(c)
    , self = this
    , entry
    , ev
    , EntryType
    , onend
    , meta = false

  if (null === header.size || !header.cksumValid) {
    var e = new Error("invalid tar file")
    e.header = header
    e.tar_file_offset = this.position
    e.tar_block = this.position / 512
    return this.emit("error", e)
  }

  switch (tar.types[header.type]) {
    case "File":
    case "OldFile":
    case "Link":
    case "SymbolicLink":
    case "CharacterDevice":
    case "BlockDevice":
    case "Directory":
    case "FIFO":
    case "ContiguousFile":
    case "GNUDumpDir":
      // start a file.
      // pass in any extended headers
      // These ones consumers are typically most interested in.
      EntryType = Entry
      ev = "entry"
      break

    case "GlobalExtendedHeader":
      // extended headers that apply to the rest of the tarball
      EntryType = ExtendedHeader
      onend = function () {
        self._global = self._global || {}
        Object.keys(entry.fields).forEach(function (k) {
          self._global[k] = entry.fields[k]
        })
      }
      ev = "globalExtendedHeader"
      meta = true
      break

    case "ExtendedHeader":
    case "OldExtendedHeader":
      // extended headers that apply to the next entry
      EntryType = ExtendedHeader
      onend = function () {
        self._extended = entry.fields
      }
      ev = "extendedHeader"
      meta = true
      break

    case "NextFileHasLongLinkpath":
      // set linkpath=<contents> in extended header
      EntryType = BufferEntry
      onend = function () {
        self._extended = self._extended || {}
        self._extended.linkpath = entry.body
      }
      ev = "longLinkpath"
      meta = true
      break

    case "NextFileHasLongPath":
    case "OldGnuLongPath":
      // set path=<contents> in file-extended header
      EntryType = BufferEntry
      onend = function () {
        self._extended = self._extended || {}
        self._extended.path = entry.body
      }
      ev = "longPath"
      meta = true
      break

    default:
      // all the rest we skip, but still set the _entry
      // member, so that we can skip over their data appropriately.
      // emit an event to say that this is an ignored entry type?
      EntryType = Entry
      ev = "ignoredEntry"
      break
  }

  var global, extended
  if (meta) {
    global = extended = null
  } else {
    var global = this._global
    var extended = this._extended

    // extendedHeader only applies to one entry, so once we start
    // an entry, it's over.
    this._extended = null
  }
  entry = new EntryType(header, extended, global)
  entry.meta = meta

  // only proxy data events of normal files.
  if (!meta) {
    entry.on("data", function (c) {
      me.emit("data", c)
    })
  }

  if (onend) entry.on("end", onend)

  this._entry = entry
  var me = this

  entry.on("pause", function () {
    me.pause()
  })

  entry.on("resume", function () {
    me.resume()
  })

  if (this.listeners("*").length) {
    this.emit("*", ev, entry)
  }

  this.emit(ev, entry)

  // Zero-byte entry.  End immediately.
  if (entry.props.size === 0) {
    entry.end()
    this._entry = null
  }
}

},{"../tar.js":46,"./buffer-entry.js":1,"./entry.js":3,"./extended-header.js":5,"./header.js":8,"assert":undefined,"block-stream":11,"fstream":12,"inherits":45,"stream":undefined}],11:[function(require,module,exports){
// write data to it, and it'll emit data in 512 byte blocks.
// if you .end() or .flush(), it'll emit whatever it's got,
// padded with nulls to 512 bytes.

module.exports = BlockStream

var Stream = require("stream").Stream
  , inherits = require("inherits")
  , assert = require("assert").ok
  , debug = process.env.DEBUG ? console.error : function () {}

function BlockStream (size, opt) {
  this.writable = this.readable = true
  this._opt = opt || {}
  this._chunkSize = size || 512
  this._offset = 0
  this._buffer = []
  this._bufferLength = 0
  if (this._opt.nopad) this._zeroes = false
  else {
    this._zeroes = new Buffer(this._chunkSize)
    for (var i = 0; i < this._chunkSize; i ++) {
      this._zeroes[i] = 0
    }
  }
}

inherits(BlockStream, Stream)

BlockStream.prototype.write = function (c) {
  // debug("   BS write", c)
  if (this._ended) throw new Error("BlockStream: write after end")
  if (c && !Buffer.isBuffer(c)) c = new Buffer(c + "")
  if (c.length) {
    this._buffer.push(c)
    this._bufferLength += c.length
  }
  // debug("pushed onto buffer", this._bufferLength)
  if (this._bufferLength >= this._chunkSize) {
    if (this._paused) {
      // debug("   BS paused, return false, need drain")
      this._needDrain = true
      return false
    }
    this._emitChunk()
  }
  return true
}

BlockStream.prototype.pause = function () {
  // debug("   BS pausing")
  this._paused = true
}

BlockStream.prototype.resume = function () {
  // debug("   BS resume")
  this._paused = false
  return this._emitChunk()
}

BlockStream.prototype.end = function (chunk) {
  // debug("end", chunk)
  if (typeof chunk === "function") cb = chunk, chunk = null
  if (chunk) this.write(chunk)
  this._ended = true
  this.flush()
}

BlockStream.prototype.flush = function () {
  this._emitChunk(true)
}

BlockStream.prototype._emitChunk = function (flush) {
  // debug("emitChunk flush=%j emitting=%j paused=%j", flush, this._emitting, this._paused)

  // emit a <chunkSize> chunk
  if (flush && this._zeroes) {
    // debug("    BS push zeroes", this._bufferLength)
    // push a chunk of zeroes
    var padBytes = (this._bufferLength % this._chunkSize)
    if (padBytes !== 0) padBytes = this._chunkSize - padBytes
    if (padBytes > 0) {
      // debug("padBytes", padBytes, this._zeroes.slice(0, padBytes))
      this._buffer.push(this._zeroes.slice(0, padBytes))
      this._bufferLength += padBytes
      // debug(this._buffer[this._buffer.length - 1].length, this._bufferLength)
    }
  }

  if (this._emitting || this._paused) return
  this._emitting = true

  // debug("    BS entering loops")
  var bufferIndex = 0
  while (this._bufferLength >= this._chunkSize &&
         (flush || !this._paused)) {
    // debug("     BS data emission loop", this._bufferLength)

    var out
      , outOffset = 0
      , outHas = this._chunkSize

    while (outHas > 0 && (flush || !this._paused) ) {
      // debug("    BS data inner emit loop", this._bufferLength)
      var cur = this._buffer[bufferIndex]
        , curHas = cur.length - this._offset
      // debug("cur=", cur)
      // debug("curHas=%j", curHas)
      // If it's not big enough to fill the whole thing, then we'll need
      // to copy multiple buffers into one.  However, if it is big enough,
      // then just slice out the part we want, to save unnecessary copying.
      // Also, need to copy if we've already done some copying, since buffers
      // can't be joined like cons strings.
      if (out || curHas < outHas) {
        out = out || new Buffer(this._chunkSize)
        cur.copy(out, outOffset,
                 this._offset, this._offset + Math.min(curHas, outHas))
      } else if (cur.length === outHas && this._offset === 0) {
        // shortcut -- cur is exactly long enough, and no offset.
        out = cur
      } else {
        // slice out the piece of cur that we need.
        out = cur.slice(this._offset, this._offset + outHas)
      }

      if (curHas > outHas) {
        // means that the current buffer couldn't be completely output
        // update this._offset to reflect how much WAS written
        this._offset += outHas
        outHas = 0
      } else {
        // output the entire current chunk.
        // toss it away
        outHas -= curHas
        outOffset += curHas
        bufferIndex ++
        this._offset = 0
      }
    }

    this._bufferLength -= this._chunkSize
    assert(out.length === this._chunkSize)
    // debug("emitting data", out)
    // debug("   BS emitting, paused=%j", this._paused, this._bufferLength)
    this.emit("data", out)
    out = null
  }
  // debug("    BS out of loops", this._bufferLength)

  // whatever is left, it's not enough to fill up a block, or we're paused
  this._buffer = this._buffer.slice(bufferIndex)
  if (this._paused) {
    // debug("    BS paused, leaving", this._bufferLength)
    this._needsDrain = true
    this._emitting = false
    return
  }

  // if flushing, and not using null-padding, then need to emit the last
  // chunk(s) sitting in the queue.  We know that it's not enough to
  // fill up a whole block, because otherwise it would have been emitted
  // above, but there may be some offset.
  var l = this._buffer.length
  if (flush && !this._zeroes && l) {
    if (l === 1) {
      if (this._offset) {
        this.emit("data", this._buffer[0].slice(this._offset))
      } else {
        this.emit("data", this._buffer[0])
      }
    } else {
      var outHas = this._bufferLength
        , out = new Buffer(outHas)
        , outOffset = 0
      for (var i = 0; i < l; i ++) {
        var cur = this._buffer[i]
          , curHas = cur.length - this._offset
        cur.copy(out, outOffset, this._offset)
        this._offset = 0
        outOffset += curHas
        this._bufferLength -= curHas
      }
      this.emit("data", out)
    }
    // truncate
    this._buffer.length = 0
    this._bufferLength = 0
    this._offset = 0
  }

  // now either drained or ended
  // debug("either draining, or ended", this._bufferLength, this._ended)
  // means that we've flushed out all that we can so far.
  if (this._needDrain) {
    // debug("emitting drain", this._bufferLength)
    this._needDrain = false
    this.emit("drain")
  }

  if ((this._bufferLength === 0) && this._ended && !this._endEmitted) {
    // debug("emitting end", this._bufferLength)
    this._endEmitted = true
    this.emit("end")
  }

  this._emitting = false

  // debug("    BS no longer emitting", flush, this._paused, this._emitting, this._bufferLength, this._chunkSize)
}

},{"assert":undefined,"inherits":45,"stream":undefined}],12:[function(require,module,exports){
exports.Abstract = require('./lib/abstract.js')
exports.Reader = require('./lib/reader.js')
exports.Writer = require('./lib/writer.js')

exports.File = {
  Reader: require('./lib/file-reader.js'),
  Writer: require('./lib/file-writer.js')
}

exports.Dir = {
  Reader: require('./lib/dir-reader.js'),
  Writer: require('./lib/dir-writer.js')
}

exports.Link = {
  Reader: require('./lib/link-reader.js'),
  Writer: require('./lib/link-writer.js')
}

exports.Proxy = {
  Reader: require('./lib/proxy-reader.js'),
  Writer: require('./lib/proxy-writer.js')
}

exports.Reader.Dir = exports.DirReader = exports.Dir.Reader
exports.Reader.File = exports.FileReader = exports.File.Reader
exports.Reader.Link = exports.LinkReader = exports.Link.Reader
exports.Reader.Proxy = exports.ProxyReader = exports.Proxy.Reader

exports.Writer.Dir = exports.DirWriter = exports.Dir.Writer
exports.Writer.File = exports.FileWriter = exports.File.Writer
exports.Writer.Link = exports.LinkWriter = exports.Link.Writer
exports.Writer.Proxy = exports.ProxyWriter = exports.Proxy.Writer

exports.collect = require('./lib/collect.js')

},{"./lib/abstract.js":13,"./lib/collect.js":14,"./lib/dir-reader.js":15,"./lib/dir-writer.js":16,"./lib/file-reader.js":17,"./lib/file-writer.js":18,"./lib/link-reader.js":20,"./lib/link-writer.js":21,"./lib/proxy-reader.js":22,"./lib/proxy-writer.js":23,"./lib/reader.js":24,"./lib/writer.js":26}],13:[function(require,module,exports){
// the parent class for all fstreams.

module.exports = Abstract

var Stream = require('stream').Stream
var inherits = require('inherits')

function Abstract () {
  Stream.call(this)
}

inherits(Abstract, Stream)

Abstract.prototype.on = function (ev, fn) {
  if (ev === 'ready' && this.ready) {
    process.nextTick(fn.bind(this))
  } else {
    Stream.prototype.on.call(this, ev, fn)
  }
  return this
}

Abstract.prototype.abort = function () {
  this._aborted = true
  this.emit('abort')
}

Abstract.prototype.destroy = function () {}

Abstract.prototype.warn = function (msg, code) {
  var self = this
  var er = decorate(msg, code, self)
  if (!self.listeners('warn')) {
    console.error('%s %s\n' +
    'path = %s\n' +
    'syscall = %s\n' +
    'fstream_type = %s\n' +
    'fstream_path = %s\n' +
    'fstream_unc_path = %s\n' +
    'fstream_class = %s\n' +
    'fstream_stack =\n%s\n',
      code || 'UNKNOWN',
      er.stack,
      er.path,
      er.syscall,
      er.fstream_type,
      er.fstream_path,
      er.fstream_unc_path,
      er.fstream_class,
      er.fstream_stack.join('\n'))
  } else {
    self.emit('warn', er)
  }
}

Abstract.prototype.info = function (msg, code) {
  this.emit('info', msg, code)
}

Abstract.prototype.error = function (msg, code, th) {
  var er = decorate(msg, code, this)
  if (th) throw er
  else this.emit('error', er)
}

function decorate (er, code, self) {
  if (!(er instanceof Error)) er = new Error(er)
  er.code = er.code || code
  er.path = er.path || self.path
  er.fstream_type = er.fstream_type || self.type
  er.fstream_path = er.fstream_path || self.path
  if (self._path !== self.path) {
    er.fstream_unc_path = er.fstream_unc_path || self._path
  }
  if (self.linkpath) {
    er.fstream_linkpath = er.fstream_linkpath || self.linkpath
  }
  er.fstream_class = er.fstream_class || self.constructor.name
  er.fstream_stack = er.fstream_stack ||
    new Error().stack.split(/\n/).slice(3).map(function (s) {
      return s.replace(/^ {4}at /, '')
    })

  return er
}

},{"inherits":45,"stream":undefined}],14:[function(require,module,exports){
module.exports = collect

function collect (stream) {
  if (stream._collected) return

  stream._collected = true
  stream.pause()

  stream.on('data', save)
  stream.on('end', save)
  var buf = []
  function save (b) {
    if (typeof b === 'string') b = new Buffer(b)
    if (Buffer.isBuffer(b) && !b.length) return
    buf.push(b)
  }

  stream.on('entry', saveEntry)
  var entryBuffer = []
  function saveEntry (e) {
    collect(e)
    entryBuffer.push(e)
  }

  stream.on('proxy', proxyPause)
  function proxyPause (p) {
    p.pause()
  }

  // replace the pipe method with a new version that will
  // unlock the buffered stuff.  if you just call .pipe()
  // without a destination, then it'll re-play the events.
  stream.pipe = (function (orig) {
    return function (dest) {
      // console.error(' === open the pipes', dest && dest.path)

      // let the entries flow through one at a time.
      // Once they're all done, then we can resume completely.
      var e = 0
      ;(function unblockEntry () {
        var entry = entryBuffer[e++]
        // console.error(" ==== unblock entry", entry && entry.path)
        if (!entry) return resume()
        entry.on('end', unblockEntry)
        if (dest) dest.add(entry)
        else stream.emit('entry', entry)
      })()

      function resume () {
        stream.removeListener('entry', saveEntry)
        stream.removeListener('data', save)
        stream.removeListener('end', save)

        stream.pipe = orig
        if (dest) stream.pipe(dest)

        buf.forEach(function (b) {
          if (b) stream.emit('data', b)
          else stream.emit('end')
        })

        stream.resume()
      }

      return dest
    }
  })(stream.pipe)
}

},{}],15:[function(require,module,exports){
// A thing that emits "entry" events with Reader objects
// Pausing it causes it to stop emitting entry events, and also
// pauses the current entry if there is one.

module.exports = DirReader

var fs = require('graceful-fs')
var inherits = require('inherits')
var path = require('path')
var Reader = require('./reader.js')
var assert = require('assert').ok

inherits(DirReader, Reader)

function DirReader (props) {
  var self = this
  if (!(self instanceof DirReader)) {
    throw new Error('DirReader must be called as constructor.')
  }

  // should already be established as a Directory type
  if (props.type !== 'Directory' || !props.Directory) {
    throw new Error('Non-directory type ' + props.type)
  }

  self.entries = null
  self._index = -1
  self._paused = false
  self._length = -1

  if (props.sort) {
    this.sort = props.sort
  }

  Reader.call(this, props)
}

DirReader.prototype._getEntries = function () {
  var self = this

  // race condition.  might pause() before calling _getEntries,
  // and then resume, and try to get them a second time.
  if (self._gotEntries) return
  self._gotEntries = true

  fs.readdir(self._path, function (er, entries) {
    if (er) return self.error(er)

    self.entries = entries

    self.emit('entries', entries)
    if (self._paused) self.once('resume', processEntries)
    else processEntries()

    function processEntries () {
      self._length = self.entries.length
      if (typeof self.sort === 'function') {
        self.entries = self.entries.sort(self.sort.bind(self))
      }
      self._read()
    }
  })
}

// start walking the dir, and emit an "entry" event for each one.
DirReader.prototype._read = function () {
  var self = this

  if (!self.entries) return self._getEntries()

  if (self._paused || self._currentEntry || self._aborted) {
    // console.error('DR paused=%j, current=%j, aborted=%j', self._paused, !!self._currentEntry, self._aborted)
    return
  }

  self._index++
  if (self._index >= self.entries.length) {
    if (!self._ended) {
      self._ended = true
      self.emit('end')
      self.emit('close')
    }
    return
  }

  // ok, handle this one, then.

  // save creating a proxy, by stat'ing the thing now.
  var p = path.resolve(self._path, self.entries[self._index])
  assert(p !== self._path)
  assert(self.entries[self._index])

  // set this to prevent trying to _read() again in the stat time.
  self._currentEntry = p
  fs[ self.props.follow ? 'stat' : 'lstat' ](p, function (er, stat) {
    if (er) return self.error(er)

    var who = self._proxy || self

    stat.path = p
    stat.basename = path.basename(p)
    stat.dirname = path.dirname(p)
    var childProps = self.getChildProps.call(who, stat)
    childProps.path = p
    childProps.basename = path.basename(p)
    childProps.dirname = path.dirname(p)

    var entry = Reader(childProps, stat)

    // console.error("DR Entry", p, stat.size)

    self._currentEntry = entry

    // "entry" events are for direct entries in a specific dir.
    // "child" events are for any and all children at all levels.
    // This nomenclature is not completely final.

    entry.on('pause', function (who) {
      if (!self._paused && !entry._disowned) {
        self.pause(who)
      }
    })

    entry.on('resume', function (who) {
      if (self._paused && !entry._disowned) {
        self.resume(who)
      }
    })

    entry.on('stat', function (props) {
      self.emit('_entryStat', entry, props)
      if (entry._aborted) return
      if (entry._paused) {
        entry.once('resume', function () {
          self.emit('entryStat', entry, props)
        })
      } else self.emit('entryStat', entry, props)
    })

    entry.on('ready', function EMITCHILD () {
      // console.error("DR emit child", entry._path)
      if (self._paused) {
        // console.error("  DR emit child - try again later")
        // pause the child, and emit the "entry" event once we drain.
        // console.error("DR pausing child entry")
        entry.pause(self)
        return self.once('resume', EMITCHILD)
      }

      // skip over sockets.  they can't be piped around properly,
      // so there's really no sense even acknowledging them.
      // if someone really wants to see them, they can listen to
      // the "socket" events.
      if (entry.type === 'Socket') {
        self.emit('socket', entry)
      } else {
        self.emitEntry(entry)
      }
    })

    var ended = false
    entry.on('close', onend)
    entry.on('disown', onend)
    function onend () {
      if (ended) return
      ended = true
      self.emit('childEnd', entry)
      self.emit('entryEnd', entry)
      self._currentEntry = null
      if (!self._paused) {
        self._read()
      }
    }

    // XXX Remove this.  Works in node as of 0.6.2 or so.
    // Long filenames should not break stuff.
    entry.on('error', function (er) {
      if (entry._swallowErrors) {
        self.warn(er)
        entry.emit('end')
        entry.emit('close')
      } else {
        self.emit('error', er)
      }
    })

    // proxy up some events.
    ;[
      'child',
      'childEnd',
      'warn'
    ].forEach(function (ev) {
      entry.on(ev, self.emit.bind(self, ev))
    })
  })
}

DirReader.prototype.disown = function (entry) {
  entry.emit('beforeDisown')
  entry._disowned = true
  entry.parent = entry.root = null
  if (entry === this._currentEntry) {
    this._currentEntry = null
  }
  entry.emit('disown')
}

DirReader.prototype.getChildProps = function () {
  return {
    depth: this.depth + 1,
    root: this.root || this,
    parent: this,
    follow: this.follow,
    filter: this.filter,
    sort: this.props.sort,
    hardlinks: this.props.hardlinks
  }
}

DirReader.prototype.pause = function (who) {
  var self = this
  if (self._paused) return
  who = who || self
  self._paused = true
  if (self._currentEntry && self._currentEntry.pause) {
    self._currentEntry.pause(who)
  }
  self.emit('pause', who)
}

DirReader.prototype.resume = function (who) {
  var self = this
  if (!self._paused) return
  who = who || self

  self._paused = false
  // console.error('DR Emit Resume', self._path)
  self.emit('resume', who)
  if (self._paused) {
    // console.error('DR Re-paused', self._path)
    return
  }

  if (self._currentEntry) {
    if (self._currentEntry.resume) self._currentEntry.resume(who)
  } else self._read()
}

DirReader.prototype.emitEntry = function (entry) {
  this.emit('entry', entry)
  this.emit('child', entry)
}

},{"./reader.js":24,"assert":undefined,"graceful-fs":28,"inherits":45,"path":undefined}],16:[function(require,module,exports){
// It is expected that, when .add() returns false, the consumer
// of the DirWriter will pause until a "drain" event occurs. Note
// that this is *almost always going to be the case*, unless the
// thing being written is some sort of unsupported type, and thus
// skipped over.

module.exports = DirWriter

var Writer = require('./writer.js')
var inherits = require('inherits')
var mkdir = require('mkdirp')
var path = require('path')
var collect = require('./collect.js')

inherits(DirWriter, Writer)

function DirWriter (props) {
  var self = this
  if (!(self instanceof DirWriter)) {
    self.error('DirWriter must be called as constructor.', null, true)
  }

  // should already be established as a Directory type
  if (props.type !== 'Directory' || !props.Directory) {
    self.error('Non-directory type ' + props.type + ' ' +
      JSON.stringify(props), null, true)
  }

  Writer.call(this, props)
}

DirWriter.prototype._create = function () {
  var self = this
  mkdir(self._path, Writer.dirmode, function (er) {
    if (er) return self.error(er)
    // ready to start getting entries!
    self.ready = true
    self.emit('ready')
    self._process()
  })
}

// a DirWriter has an add(entry) method, but its .write() doesn't
// do anything.  Why a no-op rather than a throw?  Because this
// leaves open the door for writing directory metadata for
// gnu/solaris style dumpdirs.
DirWriter.prototype.write = function () {
  return true
}

DirWriter.prototype.end = function () {
  this._ended = true
  this._process()
}

DirWriter.prototype.add = function (entry) {
  var self = this

  // console.error('\tadd', entry._path, '->', self._path)
  collect(entry)
  if (!self.ready || self._currentEntry) {
    self._buffer.push(entry)
    return false
  }

  // create a new writer, and pipe the incoming entry into it.
  if (self._ended) {
    return self.error('add after end')
  }

  self._buffer.push(entry)
  self._process()

  return this._buffer.length === 0
}

DirWriter.prototype._process = function () {
  var self = this

  // console.error('DW Process p=%j', self._processing, self.basename)

  if (self._processing) return

  var entry = self._buffer.shift()
  if (!entry) {
    // console.error("DW Drain")
    self.emit('drain')
    if (self._ended) self._finish()
    return
  }

  self._processing = true
  // console.error("DW Entry", entry._path)

  self.emit('entry', entry)

  // ok, add this entry
  //
  // don't allow recursive copying
  var p = entry
  var pp
  do {
    pp = p._path || p.path
    if (pp === self.root._path || pp === self._path ||
      (pp && pp.indexOf(self._path) === 0)) {
      // console.error('DW Exit (recursive)', entry.basename, self._path)
      self._processing = false
      if (entry._collected) entry.pipe()
      return self._process()
    }
    p = p.parent
  } while (p)

  // console.error("DW not recursive")

  // chop off the entry's root dir, replace with ours
  var props = {
    parent: self,
    root: self.root || self,
    type: entry.type,
    depth: self.depth + 1
  }

  pp = entry._path || entry.path || entry.props.path
  if (entry.parent) {
    pp = pp.substr(entry.parent._path.length + 1)
  }
  // get rid of any ../../ shenanigans
  props.path = path.join(self.path, path.join('/', pp))

  // if i have a filter, the child should inherit it.
  props.filter = self.filter

  // all the rest of the stuff, copy over from the source.
  Object.keys(entry.props).forEach(function (k) {
    if (!props.hasOwnProperty(k)) {
      props[k] = entry.props[k]
    }
  })

  // not sure at this point what kind of writer this is.
  var child = self._currentChild = new Writer(props)
  child.on('ready', function () {
    // console.error("DW Child Ready", child.type, child._path)
    // console.error("  resuming", entry._path)
    entry.pipe(child)
    entry.resume()
  })

  // XXX Make this work in node.
  // Long filenames should not break stuff.
  child.on('error', function (er) {
    if (child._swallowErrors) {
      self.warn(er)
      child.emit('end')
      child.emit('close')
    } else {
      self.emit('error', er)
    }
  })

  // we fire _end internally *after* end, so that we don't move on
  // until any "end" listeners have had their chance to do stuff.
  child.on('close', onend)
  var ended = false
  function onend () {
    if (ended) return
    ended = true
    // console.error("* DW Child end", child.basename)
    self._currentChild = null
    self._processing = false
    self._process()
  }
}

},{"./collect.js":14,"./writer.js":26,"inherits":45,"mkdirp":31,"path":undefined}],17:[function(require,module,exports){
// Basically just a wrapper around an fs.ReadStream

module.exports = FileReader

var fs = require('graceful-fs')
var inherits = require('inherits')
var Reader = require('./reader.js')
var EOF = {EOF: true}
var CLOSE = {CLOSE: true}

inherits(FileReader, Reader)

function FileReader (props) {
  // console.error("    FR create", props.path, props.size, new Error().stack)
  var self = this
  if (!(self instanceof FileReader)) {
    throw new Error('FileReader must be called as constructor.')
  }

  // should already be established as a File type
  // XXX Todo: preserve hardlinks by tracking dev+inode+nlink,
  // with a HardLinkReader class.
  if (!((props.type === 'Link' && props.Link) ||
    (props.type === 'File' && props.File))) {
    throw new Error('Non-file type ' + props.type)
  }

  self._buffer = []
  self._bytesEmitted = 0
  Reader.call(self, props)
}

FileReader.prototype._getStream = function () {
  var self = this
  var stream = self._stream = fs.createReadStream(self._path, self.props)

  if (self.props.blksize) {
    stream.bufferSize = self.props.blksize
  }

  stream.on('open', self.emit.bind(self, 'open'))

  stream.on('data', function (c) {
    // console.error('\t\t%d %s', c.length, self.basename)
    self._bytesEmitted += c.length
    // no point saving empty chunks
    if (!c.length) {
      return
    } else if (self._paused || self._buffer.length) {
      self._buffer.push(c)
      self._read()
    } else self.emit('data', c)
  })

  stream.on('end', function () {
    if (self._paused || self._buffer.length) {
      // console.error('FR Buffering End', self._path)
      self._buffer.push(EOF)
      self._read()
    } else {
      self.emit('end')
    }

    if (self._bytesEmitted !== self.props.size) {
      self.error("Didn't get expected byte count\n" +
        'expect: ' + self.props.size + '\n' +
        'actual: ' + self._bytesEmitted)
    }
  })

  stream.on('close', function () {
    if (self._paused || self._buffer.length) {
      // console.error('FR Buffering Close', self._path)
      self._buffer.push(CLOSE)
      self._read()
    } else {
      // console.error('FR close 1', self._path)
      self.emit('close')
    }
  })

  stream.on('error', function (e) {
    self.emit('error', e)
  })

  self._read()
}

FileReader.prototype._read = function () {
  var self = this
  // console.error('FR _read', self._path)
  if (self._paused) {
    // console.error('FR _read paused', self._path)
    return
  }

  if (!self._stream) {
    // console.error('FR _getStream calling', self._path)
    return self._getStream()
  }

  // clear out the buffer, if there is one.
  if (self._buffer.length) {
    // console.error('FR _read has buffer', self._buffer.length, self._path)
    var buf = self._buffer
    for (var i = 0, l = buf.length; i < l; i++) {
      var c = buf[i]
      if (c === EOF) {
        // console.error('FR Read emitting buffered end', self._path)
        self.emit('end')
      } else if (c === CLOSE) {
        // console.error('FR Read emitting buffered close', self._path)
        self.emit('close')
      } else {
        // console.error('FR Read emitting buffered data', self._path)
        self.emit('data', c)
      }

      if (self._paused) {
        // console.error('FR Read Re-pausing at '+i, self._path)
        self._buffer = buf.slice(i)
        return
      }
    }
    self._buffer.length = 0
  }
// console.error("FR _read done")
// that's about all there is to it.
}

FileReader.prototype.pause = function (who) {
  var self = this
  // console.error('FR Pause', self._path)
  if (self._paused) return
  who = who || self
  self._paused = true
  if (self._stream) self._stream.pause()
  self.emit('pause', who)
}

FileReader.prototype.resume = function (who) {
  var self = this
  // console.error('FR Resume', self._path)
  if (!self._paused) return
  who = who || self
  self.emit('resume', who)
  self._paused = false
  if (self._stream) self._stream.resume()
  self._read()
}

},{"./reader.js":24,"graceful-fs":28,"inherits":45}],18:[function(require,module,exports){
module.exports = FileWriter

var fs = require('graceful-fs')
var Writer = require('./writer.js')
var inherits = require('inherits')
var EOF = {}

inherits(FileWriter, Writer)

function FileWriter (props) {
  var self = this
  if (!(self instanceof FileWriter)) {
    throw new Error('FileWriter must be called as constructor.')
  }

  // should already be established as a File type
  if (props.type !== 'File' || !props.File) {
    throw new Error('Non-file type ' + props.type)
  }

  self._buffer = []
  self._bytesWritten = 0

  Writer.call(this, props)
}

FileWriter.prototype._create = function () {
  var self = this
  if (self._stream) return

  var so = {}
  if (self.props.flags) so.flags = self.props.flags
  so.mode = Writer.filemode
  if (self._old && self._old.blksize) so.bufferSize = self._old.blksize

  self._stream = fs.createWriteStream(self._path, so)

  self._stream.on('open', function () {
    // console.error("FW open", self._buffer, self._path)
    self.ready = true
    self._buffer.forEach(function (c) {
      if (c === EOF) self._stream.end()
      else self._stream.write(c)
    })
    self.emit('ready')
    // give this a kick just in case it needs it.
    self.emit('drain')
  })

  self._stream.on('error', function (er) { self.emit('error', er) })

  self._stream.on('drain', function () { self.emit('drain') })

  self._stream.on('close', function () {
    // console.error('\n\nFW Stream Close', self._path, self.size)
    self._finish()
  })
}

FileWriter.prototype.write = function (c) {
  var self = this

  self._bytesWritten += c.length

  if (!self.ready) {
    if (!Buffer.isBuffer(c) && typeof c !== 'string') {
      throw new Error('invalid write data')
    }
    self._buffer.push(c)
    return false
  }

  var ret = self._stream.write(c)
  // console.error('\t-- fw wrote, _stream says', ret, self._stream._queue.length)

  // allow 2 buffered writes, because otherwise there's just too
  // much stop and go bs.
  if (ret === false && self._stream._queue) {
    return self._stream._queue.length <= 2
  } else {
    return ret
  }
}

FileWriter.prototype.end = function (c) {
  var self = this

  if (c) self.write(c)

  if (!self.ready) {
    self._buffer.push(EOF)
    return false
  }

  return self._stream.end()
}

FileWriter.prototype._finish = function () {
  var self = this
  if (typeof self.size === 'number' && self._bytesWritten !== self.size) {
    self.error(
      'Did not get expected byte count.\n' +
      'expect: ' + self.size + '\n' +
      'actual: ' + self._bytesWritten)
  }
  Writer.prototype._finish.call(self)
}

},{"./writer.js":26,"graceful-fs":28,"inherits":45}],19:[function(require,module,exports){
module.exports = getType

function getType (st) {
  var types = [
    'Directory',
    'File',
    'SymbolicLink',
    'Link', // special for hardlinks from tarballs
    'BlockDevice',
    'CharacterDevice',
    'FIFO',
    'Socket'
  ]
  var type

  if (st.type && types.indexOf(st.type) !== -1) {
    st[st.type] = true
    return st.type
  }

  for (var i = 0, l = types.length; i < l; i++) {
    type = types[i]
    var is = st[type] || st['is' + type]
    if (typeof is === 'function') is = is.call(st)
    if (is) {
      st[type] = true
      st.type = type
      return type
    }
  }

  return null
}

},{}],20:[function(require,module,exports){
// Basically just a wrapper around an fs.readlink
//
// XXX: Enhance this to support the Link type, by keeping
// a lookup table of {<dev+inode>:<path>}, so that hardlinks
// can be preserved in tarballs.

module.exports = LinkReader

var fs = require('graceful-fs')
var inherits = require('inherits')
var Reader = require('./reader.js')

inherits(LinkReader, Reader)

function LinkReader (props) {
  var self = this
  if (!(self instanceof LinkReader)) {
    throw new Error('LinkReader must be called as constructor.')
  }

  if (!((props.type === 'Link' && props.Link) ||
    (props.type === 'SymbolicLink' && props.SymbolicLink))) {
    throw new Error('Non-link type ' + props.type)
  }

  Reader.call(self, props)
}

// When piping a LinkReader into a LinkWriter, we have to
// already have the linkpath property set, so that has to
// happen *before* the "ready" event, which means we need to
// override the _stat method.
LinkReader.prototype._stat = function (currentStat) {
  var self = this
  fs.readlink(self._path, function (er, linkpath) {
    if (er) return self.error(er)
    self.linkpath = self.props.linkpath = linkpath
    self.emit('linkpath', linkpath)
    Reader.prototype._stat.call(self, currentStat)
  })
}

LinkReader.prototype._read = function () {
  var self = this
  if (self._paused) return
  // basically just a no-op, since we got all the info we need
  // from the _stat method
  if (!self._ended) {
    self.emit('end')
    self.emit('close')
    self._ended = true
  }
}

},{"./reader.js":24,"graceful-fs":28,"inherits":45}],21:[function(require,module,exports){
module.exports = LinkWriter

var fs = require('graceful-fs')
var Writer = require('./writer.js')
var inherits = require('inherits')
var path = require('path')
var rimraf = require('rimraf')

inherits(LinkWriter, Writer)

function LinkWriter (props) {
  var self = this
  if (!(self instanceof LinkWriter)) {
    throw new Error('LinkWriter must be called as constructor.')
  }

  // should already be established as a Link type
  if (!((props.type === 'Link' && props.Link) ||
    (props.type === 'SymbolicLink' && props.SymbolicLink))) {
    throw new Error('Non-link type ' + props.type)
  }

  if (props.linkpath === '') props.linkpath = '.'
  if (!props.linkpath) {
    self.error('Need linkpath property to create ' + props.type)
  }

  Writer.call(this, props)
}

LinkWriter.prototype._create = function () {
  // console.error(" LW _create")
  var self = this
  var hard = self.type === 'Link' || process.platform === 'win32'
  var link = hard ? 'link' : 'symlink'
  var lp = hard ? path.resolve(self.dirname, self.linkpath) : self.linkpath

  // can only change the link path by clobbering
  // For hard links, let's just assume that's always the case, since
  // there's no good way to read them if we don't already know.
  if (hard) return clobber(self, lp, link)

  fs.readlink(self._path, function (er, p) {
    // only skip creation if it's exactly the same link
    if (p && p === lp) return finish(self)
    clobber(self, lp, link)
  })
}

function clobber (self, lp, link) {
  rimraf(self._path, function (er) {
    if (er) return self.error(er)
    create(self, lp, link)
  })
}

function create (self, lp, link) {
  fs[link](lp, self._path, function (er) {
    // if this is a hard link, and we're in the process of writing out a
    // directory, it's very possible that the thing we're linking to
    // doesn't exist yet (especially if it was intended as a symlink),
    // so swallow ENOENT errors here and just soldier in.
    // Additionally, an EPERM or EACCES can happen on win32 if it's trying
    // to make a link to a directory.  Again, just skip it.
    // A better solution would be to have fs.symlink be supported on
    // windows in some nice fashion.
    if (er) {
      if ((er.code === 'ENOENT' ||
        er.code === 'EACCES' ||
        er.code === 'EPERM') && process.platform === 'win32') {
        self.ready = true
        self.emit('ready')
        self.emit('end')
        self.emit('close')
        self.end = self._finish = function () {}
      } else return self.error(er)
    }
    finish(self)
  })
}

function finish (self) {
  self.ready = true
  self.emit('ready')
  if (self._ended && !self._finished) self._finish()
}

LinkWriter.prototype.end = function () {
  // console.error("LW finish in end")
  this._ended = true
  if (this.ready) {
    this._finished = true
    this._finish()
  }
}

},{"./writer.js":26,"graceful-fs":28,"inherits":45,"path":undefined,"rimraf":44}],22:[function(require,module,exports){
// A reader for when we don't yet know what kind of thing
// the thing is.

module.exports = ProxyReader

var Reader = require('./reader.js')
var getType = require('./get-type.js')
var inherits = require('inherits')
var fs = require('graceful-fs')

inherits(ProxyReader, Reader)

function ProxyReader (props) {
  var self = this
  if (!(self instanceof ProxyReader)) {
    throw new Error('ProxyReader must be called as constructor.')
  }

  self.props = props
  self._buffer = []
  self.ready = false

  Reader.call(self, props)
}

ProxyReader.prototype._stat = function () {
  var self = this
  var props = self.props
  // stat the thing to see what the proxy should be.
  var stat = props.follow ? 'stat' : 'lstat'

  fs[stat](props.path, function (er, current) {
    var type
    if (er || !current) {
      type = 'File'
    } else {
      type = getType(current)
    }

    props[type] = true
    props.type = self.type = type

    self._old = current
    self._addProxy(Reader(props, current))
  })
}

ProxyReader.prototype._addProxy = function (proxy) {
  var self = this
  if (self._proxyTarget) {
    return self.error('proxy already set')
  }

  self._proxyTarget = proxy
  proxy._proxy = self

  ;[
    'error',
    'data',
    'end',
    'close',
    'linkpath',
    'entry',
    'entryEnd',
    'child',
    'childEnd',
    'warn',
    'stat'
  ].forEach(function (ev) {
    // console.error('~~ proxy event', ev, self.path)
    proxy.on(ev, self.emit.bind(self, ev))
  })

  self.emit('proxy', proxy)

  proxy.on('ready', function () {
    // console.error("~~ proxy is ready!", self.path)
    self.ready = true
    self.emit('ready')
  })

  var calls = self._buffer
  self._buffer.length = 0
  calls.forEach(function (c) {
    proxy[c[0]].apply(proxy, c[1])
  })
}

ProxyReader.prototype.pause = function () {
  return this._proxyTarget ? this._proxyTarget.pause() : false
}

ProxyReader.prototype.resume = function () {
  return this._proxyTarget ? this._proxyTarget.resume() : false
}

},{"./get-type.js":19,"./reader.js":24,"graceful-fs":28,"inherits":45}],23:[function(require,module,exports){
// A writer for when we don't know what kind of thing
// the thing is.  That is, it's not explicitly set,
// so we're going to make it whatever the thing already
// is, or "File"
//
// Until then, collect all events.

module.exports = ProxyWriter

var Writer = require('./writer.js')
var getType = require('./get-type.js')
var inherits = require('inherits')
var collect = require('./collect.js')
var fs = require('fs')

inherits(ProxyWriter, Writer)

function ProxyWriter (props) {
  var self = this
  if (!(self instanceof ProxyWriter)) {
    throw new Error('ProxyWriter must be called as constructor.')
  }

  self.props = props
  self._needDrain = false

  Writer.call(self, props)
}

ProxyWriter.prototype._stat = function () {
  var self = this
  var props = self.props
  // stat the thing to see what the proxy should be.
  var stat = props.follow ? 'stat' : 'lstat'

  fs[stat](props.path, function (er, current) {
    var type
    if (er || !current) {
      type = 'File'
    } else {
      type = getType(current)
    }

    props[type] = true
    props.type = self.type = type

    self._old = current
    self._addProxy(Writer(props, current))
  })
}

ProxyWriter.prototype._addProxy = function (proxy) {
  // console.error("~~ set proxy", this.path)
  var self = this
  if (self._proxy) {
    return self.error('proxy already set')
  }

  self._proxy = proxy
  ;[
    'ready',
    'error',
    'close',
    'pipe',
    'drain',
    'warn'
  ].forEach(function (ev) {
    proxy.on(ev, self.emit.bind(self, ev))
  })

  self.emit('proxy', proxy)

  var calls = self._buffer
  calls.forEach(function (c) {
    // console.error("~~ ~~ proxy buffered call", c[0], c[1])
    proxy[c[0]].apply(proxy, c[1])
  })
  self._buffer.length = 0
  if (self._needsDrain) self.emit('drain')
}

ProxyWriter.prototype.add = function (entry) {
  // console.error("~~ proxy add")
  collect(entry)

  if (!this._proxy) {
    this._buffer.push(['add', [entry]])
    this._needDrain = true
    return false
  }
  return this._proxy.add(entry)
}

ProxyWriter.prototype.write = function (c) {
  // console.error('~~ proxy write')
  if (!this._proxy) {
    this._buffer.push(['write', [c]])
    this._needDrain = true
    return false
  }
  return this._proxy.write(c)
}

ProxyWriter.prototype.end = function (c) {
  // console.error('~~ proxy end')
  if (!this._proxy) {
    this._buffer.push(['end', [c]])
    return false
  }
  return this._proxy.end(c)
}

},{"./collect.js":14,"./get-type.js":19,"./writer.js":26,"fs":undefined,"inherits":45}],24:[function(require,module,exports){
module.exports = Reader

var fs = require('graceful-fs')
var Stream = require('stream').Stream
var inherits = require('inherits')
var path = require('path')
var getType = require('./get-type.js')
var hardLinks = Reader.hardLinks = {}
var Abstract = require('./abstract.js')

// Must do this *before* loading the child classes
inherits(Reader, Abstract)

var LinkReader = require('./link-reader.js')

function Reader (props, currentStat) {
  var self = this
  if (!(self instanceof Reader)) return new Reader(props, currentStat)

  if (typeof props === 'string') {
    props = { path: props }
  }

  if (!props.path) {
    self.error('Must provide a path', null, true)
  }

  // polymorphism.
  // call fstream.Reader(dir) to get a DirReader object, etc.
  // Note that, unlike in the Writer case, ProxyReader is going
  // to be the *normal* state of affairs, since we rarely know
  // the type of a file prior to reading it.

  var type
  var ClassType

  if (props.type && typeof props.type === 'function') {
    type = props.type
    ClassType = type
  } else {
    type = getType(props)
    ClassType = Reader
  }

  if (currentStat && !type) {
    type = getType(currentStat)
    props[type] = true
    props.type = type
  }

  switch (type) {
    case 'Directory':
      ClassType = require('./dir-reader.js')
      break

    case 'Link':
    // XXX hard links are just files.
    // However, it would be good to keep track of files' dev+inode
    // and nlink values, and create a HardLinkReader that emits
    // a linkpath value of the original copy, so that the tar
    // writer can preserve them.
    // ClassType = HardLinkReader
    // break

    case 'File':
      ClassType = require('./file-reader.js')
      break

    case 'SymbolicLink':
      ClassType = LinkReader
      break

    case 'Socket':
      ClassType = require('./socket-reader.js')
      break

    case null:
      ClassType = require('./proxy-reader.js')
      break
  }

  if (!(self instanceof ClassType)) {
    return new ClassType(props)
  }

  Abstract.call(self)

  self.readable = true
  self.writable = false

  self.type = type
  self.props = props
  self.depth = props.depth = props.depth || 0
  self.parent = props.parent || null
  self.root = props.root || (props.parent && props.parent.root) || self

  self._path = self.path = path.resolve(props.path)
  if (process.platform === 'win32') {
    self.path = self._path = self.path.replace(/\?/g, '_')
    if (self._path.length >= 260) {
      // how DOES one create files on the moon?
      // if the path has spaces in it, then UNC will fail.
      self._swallowErrors = true
      // if (self._path.indexOf(" ") === -1) {
      self._path = '\\\\?\\' + self.path.replace(/\//g, '\\')
    // }
    }
  }
  self.basename = props.basename = path.basename(self.path)
  self.dirname = props.dirname = path.dirname(self.path)

  // these have served their purpose, and are now just noisy clutter
  props.parent = props.root = null

  // console.error("\n\n\n%s setting size to", props.path, props.size)
  self.size = props.size
  self.filter = typeof props.filter === 'function' ? props.filter : null
  if (props.sort === 'alpha') props.sort = alphasort

  // start the ball rolling.
  // this will stat the thing, and then call self._read()
  // to start reading whatever it is.
  // console.error("calling stat", props.path, currentStat)
  self._stat(currentStat)
}

function alphasort (a, b) {
  return a === b ? 0
    : a.toLowerCase() > b.toLowerCase() ? 1
      : a.toLowerCase() < b.toLowerCase() ? -1
        : a > b ? 1
          : -1
}

Reader.prototype._stat = function (currentStat) {
  var self = this
  var props = self.props
  var stat = props.follow ? 'stat' : 'lstat'
  // console.error("Reader._stat", self._path, currentStat)
  if (currentStat) process.nextTick(statCb.bind(null, null, currentStat))
  else fs[stat](self._path, statCb)

  function statCb (er, props_) {
    // console.error("Reader._stat, statCb", self._path, props_, props_.nlink)
    if (er) return self.error(er)

    Object.keys(props_).forEach(function (k) {
      props[k] = props_[k]
    })

    // if it's not the expected size, then abort here.
    if (undefined !== self.size && props.size !== self.size) {
      return self.error('incorrect size')
    }
    self.size = props.size

    var type = getType(props)
    var handleHardlinks = props.hardlinks !== false

    // special little thing for handling hardlinks.
    if (handleHardlinks && type !== 'Directory' && props.nlink && props.nlink > 1) {
      var k = props.dev + ':' + props.ino
      // console.error("Reader has nlink", self._path, k)
      if (hardLinks[k] === self._path || !hardLinks[k]) {
        hardLinks[k] = self._path
      } else {
        // switch into hardlink mode.
        type = self.type = self.props.type = 'Link'
        self.Link = self.props.Link = true
        self.linkpath = self.props.linkpath = hardLinks[k]
        // console.error("Hardlink detected, switching mode", self._path, self.linkpath)
        // Setting __proto__ would arguably be the "correct"
        // approach here, but that just seems too wrong.
        self._stat = self._read = LinkReader.prototype._read
      }
    }

    if (self.type && self.type !== type) {
      self.error('Unexpected type: ' + type)
    }

    // if the filter doesn't pass, then just skip over this one.
    // still have to emit end so that dir-walking can move on.
    if (self.filter) {
      var who = self._proxy || self
      // special handling for ProxyReaders
      if (!self.filter.call(who, who, props)) {
        if (!self._disowned) {
          self.abort()
          self.emit('end')
          self.emit('close')
        }
        return
      }
    }

    // last chance to abort or disown before the flow starts!
    var events = ['_stat', 'stat', 'ready']
    var e = 0
    ;(function go () {
      if (self._aborted) {
        self.emit('end')
        self.emit('close')
        return
      }

      if (self._paused && self.type !== 'Directory') {
        self.once('resume', go)
        return
      }

      var ev = events[e++]
      if (!ev) {
        return self._read()
      }
      self.emit(ev, props)
      go()
    })()
  }
}

Reader.prototype.pipe = function (dest) {
  var self = this
  if (typeof dest.add === 'function') {
    // piping to a multi-compatible, and we've got directory entries.
    self.on('entry', function (entry) {
      var ret = dest.add(entry)
      if (ret === false) {
        self.pause()
      }
    })
  }

  // console.error("R Pipe apply Stream Pipe")
  return Stream.prototype.pipe.apply(this, arguments)
}

Reader.prototype.pause = function (who) {
  this._paused = true
  who = who || this
  this.emit('pause', who)
  if (this._stream) this._stream.pause(who)
}

Reader.prototype.resume = function (who) {
  this._paused = false
  who = who || this
  this.emit('resume', who)
  if (this._stream) this._stream.resume(who)
  this._read()
}

Reader.prototype._read = function () {
  this.error('Cannot read unknown type: ' + this.type)
}

},{"./abstract.js":13,"./dir-reader.js":15,"./file-reader.js":17,"./get-type.js":19,"./link-reader.js":20,"./proxy-reader.js":22,"./socket-reader.js":25,"graceful-fs":28,"inherits":45,"path":undefined,"stream":undefined}],25:[function(require,module,exports){
// Just get the stats, and then don't do anything.
// You can't really "read" from a socket.  You "connect" to it.
// Mostly, this is here so that reading a dir with a socket in it
// doesn't blow up.

module.exports = SocketReader

var inherits = require('inherits')
var Reader = require('./reader.js')

inherits(SocketReader, Reader)

function SocketReader (props) {
  var self = this
  if (!(self instanceof SocketReader)) {
    throw new Error('SocketReader must be called as constructor.')
  }

  if (!(props.type === 'Socket' && props.Socket)) {
    throw new Error('Non-socket type ' + props.type)
  }

  Reader.call(self, props)
}

SocketReader.prototype._read = function () {
  var self = this
  if (self._paused) return
  // basically just a no-op, since we got all the info we have
  // from the _stat method
  if (!self._ended) {
    self.emit('end')
    self.emit('close')
    self._ended = true
  }
}

},{"./reader.js":24,"inherits":45}],26:[function(require,module,exports){
module.exports = Writer

var fs = require('graceful-fs')
var inherits = require('inherits')
var rimraf = require('rimraf')
var mkdir = require('mkdirp')
var path = require('path')
var umask = process.platform === 'win32' ? 0 : process.umask()
var getType = require('./get-type.js')
var Abstract = require('./abstract.js')

// Must do this *before* loading the child classes
inherits(Writer, Abstract)

Writer.dirmode = parseInt('0777', 8) & (~umask)
Writer.filemode = parseInt('0666', 8) & (~umask)

var DirWriter = require('./dir-writer.js')
var LinkWriter = require('./link-writer.js')
var FileWriter = require('./file-writer.js')
var ProxyWriter = require('./proxy-writer.js')

// props is the desired state.  current is optionally the current stat,
// provided here so that subclasses can avoid statting the target
// more than necessary.
function Writer (props, current) {
  var self = this

  if (typeof props === 'string') {
    props = { path: props }
  }

  if (!props.path) self.error('Must provide a path', null, true)

  // polymorphism.
  // call fstream.Writer(dir) to get a DirWriter object, etc.
  var type = getType(props)
  var ClassType = Writer

  switch (type) {
    case 'Directory':
      ClassType = DirWriter
      break
    case 'File':
      ClassType = FileWriter
      break
    case 'Link':
    case 'SymbolicLink':
      ClassType = LinkWriter
      break
    case null:
    default:
      // Don't know yet what type to create, so we wrap in a proxy.
      ClassType = ProxyWriter
      break
  }

  if (!(self instanceof ClassType)) return new ClassType(props)

  // now get down to business.

  Abstract.call(self)

  // props is what we want to set.
  // set some convenience properties as well.
  self.type = props.type
  self.props = props
  self.depth = props.depth || 0
  self.clobber = props.clobber === false ? props.clobber : true
  self.parent = props.parent || null
  self.root = props.root || (props.parent && props.parent.root) || self

  self._path = self.path = path.resolve(props.path)
  if (process.platform === 'win32') {
    self.path = self._path = self.path.replace(/\?/g, '_')
    if (self._path.length >= 260) {
      self._swallowErrors = true
      self._path = '\\\\?\\' + self.path.replace(/\//g, '\\')
    }
  }
  self.basename = path.basename(props.path)
  self.dirname = path.dirname(props.path)
  self.linkpath = props.linkpath || null

  props.parent = props.root = null

  // console.error("\n\n\n%s setting size to", props.path, props.size)
  self.size = props.size

  if (typeof props.mode === 'string') {
    props.mode = parseInt(props.mode, 8)
  }

  self.readable = false
  self.writable = true

  // buffer until ready, or while handling another entry
  self._buffer = []
  self.ready = false

  self.filter = typeof props.filter === 'function' ? props.filter : null

  // start the ball rolling.
  // this checks what's there already, and then calls
  // self._create() to call the impl-specific creation stuff.
  self._stat(current)
}

// Calling this means that it's something we can't create.
// Just assert that it's already there, otherwise raise a warning.
Writer.prototype._create = function () {
  var self = this
  fs[self.props.follow ? 'stat' : 'lstat'](self._path, function (er) {
    if (er) {
      return self.warn('Cannot create ' + self._path + '\n' +
        'Unsupported type: ' + self.type, 'ENOTSUP')
    }
    self._finish()
  })
}

Writer.prototype._stat = function (current) {
  var self = this
  var props = self.props
  var stat = props.follow ? 'stat' : 'lstat'
  var who = self._proxy || self

  if (current) statCb(null, current)
  else fs[stat](self._path, statCb)

  function statCb (er, current) {
    if (self.filter && !self.filter.call(who, who, current)) {
      self._aborted = true
      self.emit('end')
      self.emit('close')
      return
    }

    // if it's not there, great.  We'll just create it.
    // if it is there, then we'll need to change whatever differs
    if (er || !current) {
      return create(self)
    }

    self._old = current
    var currentType = getType(current)

    // if it's a type change, then we need to clobber or error.
    // if it's not a type change, then let the impl take care of it.
    if (currentType !== self.type) {
      return rimraf(self._path, function (er) {
        if (er) return self.error(er)
        self._old = null
        create(self)
      })
    }

    // otherwise, just handle in the app-specific way
    // this creates a fs.WriteStream, or mkdir's, or whatever
    create(self)
  }
}

function create (self) {
  // console.error("W create", self._path, Writer.dirmode)

  // XXX Need to clobber non-dirs that are in the way,
  // unless { clobber: false } in the props.
  mkdir(path.dirname(self._path), Writer.dirmode, function (er, made) {
    // console.error("W created", path.dirname(self._path), er)
    if (er) return self.error(er)

    // later on, we have to set the mode and owner for these
    self._madeDir = made
    return self._create()
  })
}

function endChmod (self, want, current, path, cb) {
  var wantMode = want.mode
  var chmod = want.follow || self.type !== 'SymbolicLink'
    ? 'chmod' : 'lchmod'

  if (!fs[chmod]) return cb()
  if (typeof wantMode !== 'number') return cb()

  var curMode = current.mode & parseInt('0777', 8)
  wantMode = wantMode & parseInt('0777', 8)
  if (wantMode === curMode) return cb()

  fs[chmod](path, wantMode, cb)
}

function endChown (self, want, current, path, cb) {
  // Don't even try it unless root.  Too easy to EPERM.
  if (process.platform === 'win32') return cb()
  if (!process.getuid || process.getuid() !== 0) return cb()
  if (typeof want.uid !== 'number' &&
    typeof want.gid !== 'number') return cb()

  if (current.uid === want.uid &&
    current.gid === want.gid) return cb()

  var chown = (self.props.follow || self.type !== 'SymbolicLink')
    ? 'chown' : 'lchown'
  if (!fs[chown]) return cb()

  if (typeof want.uid !== 'number') want.uid = current.uid
  if (typeof want.gid !== 'number') want.gid = current.gid

  fs[chown](path, want.uid, want.gid, cb)
}

function endUtimes (self, want, current, path, cb) {
  if (!fs.utimes || process.platform === 'win32') return cb()

  var utimes = (want.follow || self.type !== 'SymbolicLink')
    ? 'utimes' : 'lutimes'

  if (utimes === 'lutimes' && !fs[utimes]) {
    utimes = 'utimes'
  }

  if (!fs[utimes]) return cb()

  var curA = current.atime
  var curM = current.mtime
  var meA = want.atime
  var meM = want.mtime

  if (meA === undefined) meA = curA
  if (meM === undefined) meM = curM

  if (!isDate(meA)) meA = new Date(meA)
  if (!isDate(meM)) meA = new Date(meM)

  if (meA.getTime() === curA.getTime() &&
    meM.getTime() === curM.getTime()) return cb()

  fs[utimes](path, meA, meM, cb)
}

// XXX This function is beastly.  Break it up!
Writer.prototype._finish = function () {
  var self = this

  if (self._finishing) return
  self._finishing = true

  // console.error(" W Finish", self._path, self.size)

  // set up all the things.
  // At this point, we're already done writing whatever we've gotta write,
  // adding files to the dir, etc.
  var todo = 0
  var errState = null
  var done = false

  if (self._old) {
    // the times will almost *certainly* have changed.
    // adds the utimes syscall, but remove another stat.
    self._old.atime = new Date(0)
    self._old.mtime = new Date(0)
    // console.error(" W Finish Stale Stat", self._path, self.size)
    setProps(self._old)
  } else {
    var stat = self.props.follow ? 'stat' : 'lstat'
    // console.error(" W Finish Stating", self._path, self.size)
    fs[stat](self._path, function (er, current) {
      // console.error(" W Finish Stated", self._path, self.size, current)
      if (er) {
        // if we're in the process of writing out a
        // directory, it's very possible that the thing we're linking to
        // doesn't exist yet (especially if it was intended as a symlink),
        // so swallow ENOENT errors here and just soldier on.
        if (er.code === 'ENOENT' &&
          (self.type === 'Link' || self.type === 'SymbolicLink') &&
          process.platform === 'win32') {
          self.ready = true
          self.emit('ready')
          self.emit('end')
          self.emit('close')
          self.end = self._finish = function () {}
          return
        } else return self.error(er)
      }
      setProps(self._old = current)
    })
  }

  return

  function setProps (current) {
    todo += 3
    endChmod(self, self.props, current, self._path, next('chmod'))
    endChown(self, self.props, current, self._path, next('chown'))
    endUtimes(self, self.props, current, self._path, next('utimes'))
  }

  function next (what) {
    return function (er) {
      // console.error("   W Finish", what, todo)
      if (errState) return
      if (er) {
        er.fstream_finish_call = what
        return self.error(errState = er)
      }
      if (--todo > 0) return
      if (done) return
      done = true

      // we may still need to set the mode/etc. on some parent dirs
      // that were created previously.  delay end/close until then.
      if (!self._madeDir) return end()
      else endMadeDir(self, self._path, end)

      function end (er) {
        if (er) {
          er.fstream_finish_call = 'setupMadeDir'
          return self.error(er)
        }
        // all the props have been set, so we're completely done.
        self.emit('end')
        self.emit('close')
      }
    }
  }
}

function endMadeDir (self, p, cb) {
  var made = self._madeDir
  // everything *between* made and path.dirname(self._path)
  // needs to be set up.  Note that this may just be one dir.
  var d = path.dirname(p)

  endMadeDir_(self, d, function (er) {
    if (er) return cb(er)
    if (d === made) {
      return cb()
    }
    endMadeDir(self, d, cb)
  })
}

function endMadeDir_ (self, p, cb) {
  var dirProps = {}
  Object.keys(self.props).forEach(function (k) {
    dirProps[k] = self.props[k]

    // only make non-readable dirs if explicitly requested.
    if (k === 'mode' && self.type !== 'Directory') {
      dirProps[k] = dirProps[k] | parseInt('0111', 8)
    }
  })

  var todo = 3
  var errState = null
  fs.stat(p, function (er, current) {
    if (er) return cb(errState = er)
    endChmod(self, dirProps, current, p, next)
    endChown(self, dirProps, current, p, next)
    endUtimes(self, dirProps, current, p, next)
  })

  function next (er) {
    if (errState) return
    if (er) return cb(errState = er)
    if (--todo === 0) return cb()
  }
}

Writer.prototype.pipe = function () {
  this.error("Can't pipe from writable stream")
}

Writer.prototype.add = function () {
  this.error("Can't add to non-Directory type")
}

Writer.prototype.write = function () {
  return true
}

function objectToString (d) {
  return Object.prototype.toString.call(d)
}

function isDate (d) {
  return typeof d === 'object' && objectToString(d) === '[object Date]'
}

},{"./abstract.js":13,"./dir-writer.js":16,"./file-writer.js":18,"./get-type.js":19,"./link-writer.js":21,"./proxy-writer.js":23,"graceful-fs":28,"inherits":45,"mkdirp":31,"path":undefined,"rimraf":44}],27:[function(require,module,exports){
'use strict'

var fs = require('fs')

module.exports = clone(fs)

function clone (obj) {
  if (obj === null || typeof obj !== 'object')
    return obj

  if (obj instanceof Object)
    var copy = { __proto__: obj.__proto__ }
  else
    var copy = Object.create(null)

  Object.getOwnPropertyNames(obj).forEach(function (key) {
    Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key))
  })

  return copy
}

},{"fs":undefined}],28:[function(require,module,exports){
var fs = require('fs')
var polyfills = require('./polyfills.js')
var legacy = require('./legacy-streams.js')
var queue = []

var util = require('util')

function noop () {}

var debug = noop
if (util.debuglog)
  debug = util.debuglog('gfs4')
else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ''))
  debug = function() {
    var m = util.format.apply(util, arguments)
    m = 'GFS4: ' + m.split(/\n/).join('\nGFS4: ')
    console.error(m)
  }

if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || '')) {
  process.on('exit', function() {
    debug(queue)
    require('assert').equal(queue.length, 0)
  })
}

module.exports = patch(require('./fs.js'))
if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH) {
  module.exports = patch(fs)
}

// Always patch fs.close/closeSync, because we want to
// retry() whenever a close happens *anywhere* in the program.
// This is essential when multiple graceful-fs instances are
// in play at the same time.
module.exports.close =
fs.close = (function (fs$close) { return function (fd, cb) {
  return fs$close.call(fs, fd, function (err) {
    if (!err)
      retry()

    if (typeof cb === 'function')
      cb.apply(this, arguments)
  })
}})(fs.close)

module.exports.closeSync =
fs.closeSync = (function (fs$closeSync) { return function (fd) {
  // Note that graceful-fs also retries when fs.closeSync() fails.
  // Looks like a bug to me, although it's probably a harmless one.
  var rval = fs$closeSync.apply(fs, arguments)
  retry()
  return rval
}})(fs.closeSync)

function patch (fs) {
  // Everything that references the open() function needs to be in here
  polyfills(fs)
  fs.gracefulify = patch
  fs.FileReadStream = ReadStream;  // Legacy name.
  fs.FileWriteStream = WriteStream;  // Legacy name.
  fs.createReadStream = createReadStream
  fs.createWriteStream = createWriteStream
  var fs$readFile = fs.readFile
  fs.readFile = readFile
  function readFile (path, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    return go$readFile(path, options, cb)

    function go$readFile (path, options, cb) {
      return fs$readFile(path, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$readFile, [path, options, cb]])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
          retry()
        }
      })
    }
  }

  var fs$writeFile = fs.writeFile
  fs.writeFile = writeFile
  function writeFile (path, data, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    return go$writeFile(path, data, options, cb)

    function go$writeFile (path, data, options, cb) {
      return fs$writeFile(path, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$writeFile, [path, data, options, cb]])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
          retry()
        }
      })
    }
  }

  var fs$appendFile = fs.appendFile
  if (fs$appendFile)
    fs.appendFile = appendFile
  function appendFile (path, data, options, cb) {
    if (typeof options === 'function')
      cb = options, options = null

    return go$appendFile(path, data, options, cb)

    function go$appendFile (path, data, options, cb) {
      return fs$appendFile(path, data, options, function (err) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$appendFile, [path, data, options, cb]])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
          retry()
        }
      })
    }
  }

  var fs$readdir = fs.readdir
  fs.readdir = readdir
  function readdir (path, cb) {
    return go$readdir(path, cb)

    function go$readdir () {
      return fs$readdir(path, function (err, files) {
        if (files && files.sort)
          files.sort();  // Backwards compatibility with graceful-fs.

        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$readdir, [path, cb]])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
          retry()
        }
      })
    }
  }


  if (process.version.substr(0, 4) === 'v0.8') {
    var legStreams = legacy(fs)
    ReadStream = legStreams.ReadStream
    WriteStream = legStreams.WriteStream
  }

  var fs$ReadStream = fs.ReadStream
  ReadStream.prototype = Object.create(fs$ReadStream.prototype)
  ReadStream.prototype.open = ReadStream$open

  var fs$WriteStream = fs.WriteStream
  WriteStream.prototype = Object.create(fs$WriteStream.prototype)
  WriteStream.prototype.open = WriteStream$open

  fs.ReadStream = ReadStream
  fs.WriteStream = WriteStream

  function ReadStream (path, options) {
    if (this instanceof ReadStream)
      return fs$ReadStream.apply(this, arguments), this
    else
      return ReadStream.apply(Object.create(ReadStream.prototype), arguments)
  }

  function ReadStream$open () {
    var that = this
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        if (that.autoClose)
          that.destroy()

        that.emit('error', err)
      } else {
        that.fd = fd
        that.emit('open', fd)
        that.read()
      }
    })
  }

  function WriteStream (path, options) {
    if (this instanceof WriteStream)
      return fs$WriteStream.apply(this, arguments), this
    else
      return WriteStream.apply(Object.create(WriteStream.prototype), arguments)
  }

  function WriteStream$open () {
    var that = this
    open(that.path, that.flags, that.mode, function (err, fd) {
      if (err) {
        that.destroy()
        that.emit('error', err)
      } else {
        that.fd = fd
        that.emit('open', fd)
      }
    })
  }

  function createReadStream (path, options) {
    return new ReadStream(path, options)
  }

  function createWriteStream (path, options) {
    return new WriteStream(path, options)
  }

  var fs$open = fs.open
  fs.open = open
  function open (path, flags, mode, cb) {
    if (typeof mode === 'function')
      cb = mode, mode = null

    return go$open(path, flags, mode, cb)

    function go$open (path, flags, mode, cb) {
      return fs$open(path, flags, mode, function (err, fd) {
        if (err && (err.code === 'EMFILE' || err.code === 'ENFILE'))
          enqueue([go$open, [path, flags, mode, cb]])
        else {
          if (typeof cb === 'function')
            cb.apply(this, arguments)
          retry()
        }
      })
    }
  }

  return fs
}

function enqueue (elem) {
  debug('ENQUEUE', elem[0].name, elem[1])
  queue.push(elem)
}

function retry () {
  var elem = queue.shift()
  if (elem) {
    debug('RETRY', elem[0].name, elem[1])
    elem[0].apply(null, elem[1])
  }
}

},{"./fs.js":27,"./legacy-streams.js":29,"./polyfills.js":30,"assert":undefined,"fs":undefined,"util":undefined}],29:[function(require,module,exports){
var Stream = require('stream').Stream

module.exports = legacy

function legacy (fs) {
  return {
    ReadStream: ReadStream,
    WriteStream: WriteStream
  }

  function ReadStream (path, options) {
    if (!(this instanceof ReadStream)) return new ReadStream(path, options);

    Stream.call(this);

    var self = this;

    this.path = path;
    this.fd = null;
    this.readable = true;
    this.paused = false;

    this.flags = 'r';
    this.mode = 438; /*=0666*/
    this.bufferSize = 64 * 1024;

    options = options || {};

    // Mixin options into this
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.encoding) this.setEncoding(this.encoding);

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.end === undefined) {
        this.end = Infinity;
      } else if ('number' !== typeof this.end) {
        throw TypeError('end must be a Number');
      }

      if (this.start > this.end) {
        throw new Error('start must be <= end');
      }

      this.pos = this.start;
    }

    if (this.fd !== null) {
      process.nextTick(function() {
        self._read();
      });
      return;
    }

    fs.open(this.path, this.flags, this.mode, function (err, fd) {
      if (err) {
        self.emit('error', err);
        self.readable = false;
        return;
      }

      self.fd = fd;
      self.emit('open', fd);
      self._read();
    })
  }

  function WriteStream (path, options) {
    if (!(this instanceof WriteStream)) return new WriteStream(path, options);

    Stream.call(this);

    this.path = path;
    this.fd = null;
    this.writable = true;

    this.flags = 'w';
    this.encoding = 'binary';
    this.mode = 438; /*=0666*/
    this.bytesWritten = 0;

    options = options || {};

    // Mixin options into this
    var keys = Object.keys(options);
    for (var index = 0, length = keys.length; index < length; index++) {
      var key = keys[index];
      this[key] = options[key];
    }

    if (this.start !== undefined) {
      if ('number' !== typeof this.start) {
        throw TypeError('start must be a Number');
      }
      if (this.start < 0) {
        throw new Error('start must be >= zero');
      }

      this.pos = this.start;
    }

    this.busy = false;
    this._queue = [];

    if (this.fd === null) {
      this._open = fs.open;
      this._queue.push([this._open, this.path, this.flags, this.mode, undefined]);
      this.flush();
    }
  }
}

},{"stream":undefined}],30:[function(require,module,exports){
var fs = require('./fs.js')
var constants = require('constants')

var origCwd = process.cwd
var cwd = null
process.cwd = function() {
  if (!cwd)
    cwd = origCwd.call(process)
  return cwd
}
try {
  process.cwd()
} catch (er) {}

var chdir = process.chdir
process.chdir = function(d) {
  cwd = null
  chdir.call(process, d)
}

module.exports = patch

function patch (fs) {
  // (re-)implement some things that are known busted or missing.

  // lchmod, broken prior to 0.6.2
  // back-port the fix here.
  if (constants.hasOwnProperty('O_SYMLINK') &&
      process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
    patchLchmod(fs)
  }

  // lutimes implementation, or no-op
  if (!fs.lutimes) {
    patchLutimes(fs)
  }

  // https://github.com/isaacs/node-graceful-fs/issues/4
  // Chown should not fail on einval or eperm if non-root.
  // It should not fail on enosys ever, as this just indicates
  // that a fs doesn't support the intended operation.

  fs.chown = chownFix(fs.chown)
  fs.fchown = chownFix(fs.fchown)
  fs.lchown = chownFix(fs.lchown)

  fs.chmod = chownFix(fs.chmod)
  fs.fchmod = chownFix(fs.fchmod)
  fs.lchmod = chownFix(fs.lchmod)

  fs.chownSync = chownFixSync(fs.chownSync)
  fs.fchownSync = chownFixSync(fs.fchownSync)
  fs.lchownSync = chownFixSync(fs.lchownSync)

  fs.chmodSync = chownFix(fs.chmodSync)
  fs.fchmodSync = chownFix(fs.fchmodSync)
  fs.lchmodSync = chownFix(fs.lchmodSync)

  // if lchmod/lchown do not exist, then make them no-ops
  if (!fs.lchmod) {
    fs.lchmod = function (path, mode, cb) {
      process.nextTick(cb)
    }
    fs.lchmodSync = function () {}
  }
  if (!fs.lchown) {
    fs.lchown = function (path, uid, gid, cb) {
      process.nextTick(cb)
    }
    fs.lchownSync = function () {}
  }

  // on Windows, A/V software can lock the directory, causing this
  // to fail with an EACCES or EPERM if the directory contains newly
  // created files.  Try again on failure, for up to 1 second.
  if (process.platform === "win32") {
    fs.rename = (function (fs$rename) { return function (from, to, cb) {
      var start = Date.now()
      fs$rename(from, to, function CB (er) {
        if (er
            && (er.code === "EACCES" || er.code === "EPERM")
            && Date.now() - start < 1000) {
          return fs$rename(from, to, CB)
        }
        if (cb) cb(er)
      })
    }})(fs.rename)
  }

  // if read() returns EAGAIN, then just try it again.
  fs.read = (function (fs$read) { return function (fd, buffer, offset, length, position, callback_) {
    var callback
    if (callback_ && typeof callback_ === 'function') {
      var eagCounter = 0
      callback = function (er, _, __) {
        if (er && er.code === 'EAGAIN' && eagCounter < 10) {
          eagCounter ++
          return fs$read.call(fs, fd, buffer, offset, length, position, callback)
        }
        callback_.apply(this, arguments)
      }
    }
    return fs$read.call(fs, fd, buffer, offset, length, position, callback)
  }})(fs.read)

  fs.readSync = (function (fs$readSync) { return function (fd, buffer, offset, length, position) {
    var eagCounter = 0
    while (true) {
      try {
        return fs$readSync.call(fs, fd, buffer, offset, length, position)
      } catch (er) {
        if (er.code === 'EAGAIN' && eagCounter < 10) {
          eagCounter ++
          continue
        }
        throw er
      }
    }
  }})(fs.readSync)
}

function patchLchmod (fs) {
  fs.lchmod = function (path, mode, callback) {
    callback = callback || noop
    fs.open( path
           , constants.O_WRONLY | constants.O_SYMLINK
           , mode
           , function (err, fd) {
      if (err) {
        callback(err)
        return
      }
      // prefer to return the chmod error, if one occurs,
      // but still try to close, and report closing errors if they occur.
      fs.fchmod(fd, mode, function (err) {
        fs.close(fd, function(err2) {
          callback(err || err2)
        })
      })
    })
  }

  fs.lchmodSync = function (path, mode) {
    var fd = fs.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode)

    // prefer to return the chmod error, if one occurs,
    // but still try to close, and report closing errors if they occur.
    var threw = true
    var ret
    try {
      ret = fs.fchmodSync(fd, mode)
      threw = false
    } finally {
      if (threw) {
        try {
          fs.closeSync(fd)
        } catch (er) {}
      } else {
        fs.closeSync(fd)
      }
    }
    return ret
  }
}

function patchLutimes (fs) {
  if (constants.hasOwnProperty("O_SYMLINK")) {
    fs.lutimes = function (path, at, mt, cb) {
      fs.open(path, constants.O_SYMLINK, function (er, fd) {
        cb = cb || noop
        if (er) return cb(er)
        fs.futimes(fd, at, mt, function (er) {
          fs.close(fd, function (er2) {
            return cb(er || er2)
          })
        })
      })
    }

    fs.lutimesSync = function (path, at, mt) {
      var fd = fs.openSync(path, constants.O_SYMLINK)
      var ret
      var threw = true
      try {
        ret = fs.futimesSync(fd, at, mt)
        threw = false
      } finally {
        if (threw) {
          try {
            fs.closeSync(fd)
          } catch (er) {}
        } else {
          fs.closeSync(fd)
        }
      }
      return ret
    }

  } else {
    fs.lutimes = function (_a, _b, _c, cb) { process.nextTick(cb) }
    fs.lutimesSync = function () {}
  }
}

function chownFix (orig) {
  if (!orig) return orig
  return function (target, uid, gid, cb) {
    return orig.call(fs, target, uid, gid, function (er, res) {
      if (chownErOk(er)) er = null
      cb(er, res)
    })
  }
}

function chownFixSync (orig) {
  if (!orig) return orig
  return function (target, uid, gid) {
    try {
      return orig.call(fs, target, uid, gid)
    } catch (er) {
      if (!chownErOk(er)) throw er
    }
  }
}

// ENOSYS means that the fs doesn't support the op. Just ignore
// that, because it doesn't matter.
//
// if there's no getuid, or if getuid() is something other
// than 0, and the error is EINVAL or EPERM, then just ignore
// it.
//
// This specific case is a silent failure in cp, install, tar,
// and most other unix tools that manage permissions.
//
// When running as root, or if other types of errors are
// encountered, then it's strict.
function chownErOk (er) {
  if (!er)
    return true

  if (er.code === "ENOSYS")
    return true

  var nonroot = !process.getuid || process.getuid() !== 0
  if (nonroot) {
    if (er.code === "EINVAL" || er.code === "EPERM")
      return true
  }

  return false
}

},{"./fs.js":27,"constants":undefined}],31:[function(require,module,exports){
var path = require('path');
var fs = require('fs');
var _0777 = parseInt('0777', 8);

module.exports = mkdirP.mkdirp = mkdirP.mkdirP = mkdirP;

function mkdirP (p, opts, f, made) {
    if (typeof opts === 'function') {
        f = opts;
        opts = {};
    }
    else if (!opts || typeof opts !== 'object') {
        opts = { mode: opts };
    }
    
    var mode = opts.mode;
    var xfs = opts.fs || fs;
    
    if (mode === undefined) {
        mode = _0777 & (~process.umask());
    }
    if (!made) made = null;
    
    var cb = f || function () {};
    p = path.resolve(p);
    
    xfs.mkdir(p, mode, function (er) {
        if (!er) {
            made = made || p;
            return cb(null, made);
        }
        switch (er.code) {
            case 'ENOENT':
                mkdirP(path.dirname(p), opts, function (er, made) {
                    if (er) cb(er, made);
                    else mkdirP(p, opts, cb, made);
                });
                break;

            // In the case of any other error, just see if there's a dir
            // there already.  If so, then hooray!  If not, then something
            // is borked.
            default:
                xfs.stat(p, function (er2, stat) {
                    // if the stat fails, then that's super weird.
                    // let the original error be the failure reason.
                    if (er2 || !stat.isDirectory()) cb(er, made)
                    else cb(null, made);
                });
                break;
        }
    });
}

mkdirP.sync = function sync (p, opts, made) {
    if (!opts || typeof opts !== 'object') {
        opts = { mode: opts };
    }
    
    var mode = opts.mode;
    var xfs = opts.fs || fs;
    
    if (mode === undefined) {
        mode = _0777 & (~process.umask());
    }
    if (!made) made = null;

    p = path.resolve(p);

    try {
        xfs.mkdirSync(p, mode);
        made = made || p;
    }
    catch (err0) {
        switch (err0.code) {
            case 'ENOENT' :
                made = sync(path.dirname(p), opts, made);
                sync(p, opts, made);
                break;

            // In the case of any other error, just see if there's a dir
            // there already.  If so, then hooray!  If not, then something
            // is borked.
            default:
                var stat;
                try {
                    stat = xfs.statSync(p);
                }
                catch (err1) {
                    throw err0;
                }
                if (!stat.isDirectory()) throw err0;
                break;
        }
    }

    return made;
};

},{"fs":undefined,"path":undefined}],32:[function(require,module,exports){
exports.alphasort = alphasort
exports.alphasorti = alphasorti
exports.setopts = setopts
exports.ownProp = ownProp
exports.makeAbs = makeAbs
exports.finish = finish
exports.mark = mark
exports.isIgnored = isIgnored
exports.childrenIgnored = childrenIgnored

function ownProp (obj, field) {
  return Object.prototype.hasOwnProperty.call(obj, field)
}

var path = require("path")
var minimatch = require("minimatch")
var isAbsolute = require("path-is-absolute")
var Minimatch = minimatch.Minimatch

function alphasorti (a, b) {
  return a.toLowerCase().localeCompare(b.toLowerCase())
}

function alphasort (a, b) {
  return a.localeCompare(b)
}

function setupIgnores (self, options) {
  self.ignore = options.ignore || []

  if (!Array.isArray(self.ignore))
    self.ignore = [self.ignore]

  if (self.ignore.length) {
    self.ignore = self.ignore.map(ignoreMap)
  }
}

// ignore patterns are always in dot:true mode.
function ignoreMap (pattern) {
  var gmatcher = null
  if (pattern.slice(-3) === '/**') {
    var gpattern = pattern.replace(/(\/\*\*)+$/, '')
    gmatcher = new Minimatch(gpattern, { dot: true })
  }

  return {
    matcher: new Minimatch(pattern, { dot: true }),
    gmatcher: gmatcher
  }
}

function setopts (self, pattern, options) {
  if (!options)
    options = {}

  // base-matching: just use globstar for that.
  if (options.matchBase && -1 === pattern.indexOf("/")) {
    if (options.noglobstar) {
      throw new Error("base matching requires globstar")
    }
    pattern = "**/" + pattern
  }

  self.silent = !!options.silent
  self.pattern = pattern
  self.strict = options.strict !== false
  self.realpath = !!options.realpath
  self.realpathCache = options.realpathCache || Object.create(null)
  self.follow = !!options.follow
  self.dot = !!options.dot
  self.mark = !!options.mark
  self.nodir = !!options.nodir
  if (self.nodir)
    self.mark = true
  self.sync = !!options.sync
  self.nounique = !!options.nounique
  self.nonull = !!options.nonull
  self.nosort = !!options.nosort
  self.nocase = !!options.nocase
  self.stat = !!options.stat
  self.noprocess = !!options.noprocess

  self.maxLength = options.maxLength || Infinity
  self.cache = options.cache || Object.create(null)
  self.statCache = options.statCache || Object.create(null)
  self.symlinks = options.symlinks || Object.create(null)

  setupIgnores(self, options)

  self.changedCwd = false
  var cwd = process.cwd()
  if (!ownProp(options, "cwd"))
    self.cwd = cwd
  else {
    self.cwd = path.resolve(options.cwd)
    self.changedCwd = self.cwd !== cwd
  }

  self.root = options.root || path.resolve(self.cwd, "/")
  self.root = path.resolve(self.root)
  if (process.platform === "win32")
    self.root = self.root.replace(/\\/g, "/")

  self.nomount = !!options.nomount

  // disable comments and negation in Minimatch.
  // Note that they are not supported in Glob itself anyway.
  options.nonegate = true
  options.nocomment = true

  self.minimatch = new Minimatch(pattern, options)
  self.options = self.minimatch.options
}

function finish (self) {
  var nou = self.nounique
  var all = nou ? [] : Object.create(null)

  for (var i = 0, l = self.matches.length; i < l; i ++) {
    var matches = self.matches[i]
    if (!matches || Object.keys(matches).length === 0) {
      if (self.nonull) {
        // do like the shell, and spit out the literal glob
        var literal = self.minimatch.globSet[i]
        if (nou)
          all.push(literal)
        else
          all[literal] = true
      }
    } else {
      // had matches
      var m = Object.keys(matches)
      if (nou)
        all.push.apply(all, m)
      else
        m.forEach(function (m) {
          all[m] = true
        })
    }
  }

  if (!nou)
    all = Object.keys(all)

  if (!self.nosort)
    all = all.sort(self.nocase ? alphasorti : alphasort)

  // at *some* point we statted all of these
  if (self.mark) {
    for (var i = 0; i < all.length; i++) {
      all[i] = self._mark(all[i])
    }
    if (self.nodir) {
      all = all.filter(function (e) {
        return !(/\/$/.test(e))
      })
    }
  }

  if (self.ignore.length)
    all = all.filter(function(m) {
      return !isIgnored(self, m)
    })

  self.found = all
}

function mark (self, p) {
  var abs = makeAbs(self, p)
  var c = self.cache[abs]
  var m = p
  if (c) {
    var isDir = c === 'DIR' || Array.isArray(c)
    var slash = p.slice(-1) === '/'

    if (isDir && !slash)
      m += '/'
    else if (!isDir && slash)
      m = m.slice(0, -1)

    if (m !== p) {
      var mabs = makeAbs(self, m)
      self.statCache[mabs] = self.statCache[abs]
      self.cache[mabs] = self.cache[abs]
    }
  }

  return m
}

// lotta situps...
function makeAbs (self, f) {
  var abs = f
  if (f.charAt(0) === '/') {
    abs = path.join(self.root, f)
  } else if (isAbsolute(f) || f === '') {
    abs = f
  } else if (self.changedCwd) {
    abs = path.resolve(self.cwd, f)
  } else {
    abs = path.resolve(f)
  }
  return abs
}


// Return true, if pattern ends with globstar '**', for the accompanying parent directory.
// Ex:- If node_modules/** is the pattern, add 'node_modules' to ignore list along with it's contents
function isIgnored (self, path) {
  if (!self.ignore.length)
    return false

  return self.ignore.some(function(item) {
    return item.matcher.match(path) || !!(item.gmatcher && item.gmatcher.match(path))
  })
}

function childrenIgnored (self, path) {
  if (!self.ignore.length)
    return false

  return self.ignore.some(function(item) {
    return !!(item.gmatcher && item.gmatcher.match(path))
  })
}

},{"minimatch":36,"path":undefined,"path-is-absolute":42}],33:[function(require,module,exports){
// Approach:
//
// 1. Get the minimatch set
// 2. For each pattern in the set, PROCESS(pattern, false)
// 3. Store matches per-set, then uniq them
//
// PROCESS(pattern, inGlobStar)
// Get the first [n] items from pattern that are all strings
// Join these together.  This is PREFIX.
//   If there is no more remaining, then stat(PREFIX) and
//   add to matches if it succeeds.  END.
//
// If inGlobStar and PREFIX is symlink and points to dir
//   set ENTRIES = []
// else readdir(PREFIX) as ENTRIES
//   If fail, END
//
// with ENTRIES
//   If pattern[n] is GLOBSTAR
//     // handle the case where the globstar match is empty
//     // by pruning it out, and testing the resulting pattern
//     PROCESS(pattern[0..n] + pattern[n+1 .. $], false)
//     // handle other cases.
//     for ENTRY in ENTRIES (not dotfiles)
//       // attach globstar + tail onto the entry
//       // Mark that this entry is a globstar match
//       PROCESS(pattern[0..n] + ENTRY + pattern[n .. $], true)
//
//   else // not globstar
//     for ENTRY in ENTRIES (not dotfiles, unless pattern[n] is dot)
//       Test ENTRY against pattern[n]
//       If fails, continue
//       If passes, PROCESS(pattern[0..n] + item + pattern[n+1 .. $])
//
// Caveat:
//   Cache all stats and readdirs results to minimize syscall.  Since all
//   we ever care about is existence and directory-ness, we can just keep
//   `true` for files, and [children,...] for directories, or `false` for
//   things that don't exist.

module.exports = glob

var fs = require('fs')
var minimatch = require('minimatch')
var Minimatch = minimatch.Minimatch
var inherits = require('inherits')
var EE = require('events').EventEmitter
var path = require('path')
var assert = require('assert')
var isAbsolute = require('path-is-absolute')
var globSync = require('./sync.js')
var common = require('./common.js')
var alphasort = common.alphasort
var alphasorti = common.alphasorti
var setopts = common.setopts
var ownProp = common.ownProp
var inflight = require('inflight')
var util = require('util')
var childrenIgnored = common.childrenIgnored
var isIgnored = common.isIgnored

var once = require('once')

function glob (pattern, options, cb) {
  if (typeof options === 'function') cb = options, options = {}
  if (!options) options = {}

  if (options.sync) {
    if (cb)
      throw new TypeError('callback provided to sync glob')
    return globSync(pattern, options)
  }

  return new Glob(pattern, options, cb)
}

glob.sync = globSync
var GlobSync = glob.GlobSync = globSync.GlobSync

// old api surface
glob.glob = glob

function extend (origin, add) {
  if (add === null || typeof add !== 'object') {
    return origin
  }

  var keys = Object.keys(add)
  var i = keys.length
  while (i--) {
    origin[keys[i]] = add[keys[i]]
  }
  return origin
}

glob.hasMagic = function (pattern, options_) {
  var options = extend({}, options_)
  options.noprocess = true

  var g = new Glob(pattern, options)
  var set = g.minimatch.set
  if (set.length > 1)
    return true

  for (var j = 0; j < set[0].length; j++) {
    if (typeof set[0][j] !== 'string')
      return true
  }

  return false
}

glob.Glob = Glob
inherits(Glob, EE)
function Glob (pattern, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = null
  }

  if (options && options.sync) {
    if (cb)
      throw new TypeError('callback provided to sync glob')
    return new GlobSync(pattern, options)
  }

  if (!(this instanceof Glob))
    return new Glob(pattern, options, cb)

  setopts(this, pattern, options)
  this._didRealPath = false

  // process each pattern in the minimatch set
  var n = this.minimatch.set.length

  // The matches are stored as {<filename>: true,...} so that
  // duplicates are automagically pruned.
  // Later, we do an Object.keys() on these.
  // Keep them as a list so we can fill in when nonull is set.
  this.matches = new Array(n)

  if (typeof cb === 'function') {
    cb = once(cb)
    this.on('error', cb)
    this.on('end', function (matches) {
      cb(null, matches)
    })
  }

  var self = this
  var n = this.minimatch.set.length
  this._processing = 0
  this.matches = new Array(n)

  this._emitQueue = []
  this._processQueue = []
  this.paused = false

  if (this.noprocess)
    return this

  if (n === 0)
    return done()

  for (var i = 0; i < n; i ++) {
    this._process(this.minimatch.set[i], i, false, done)
  }

  function done () {
    --self._processing
    if (self._processing <= 0)
      self._finish()
  }
}

Glob.prototype._finish = function () {
  assert(this instanceof Glob)
  if (this.aborted)
    return

  if (this.realpath && !this._didRealpath)
    return this._realpath()

  common.finish(this)
  this.emit('end', this.found)
}

Glob.prototype._realpath = function () {
  if (this._didRealpath)
    return

  this._didRealpath = true

  var n = this.matches.length
  if (n === 0)
    return this._finish()

  var self = this
  for (var i = 0; i < this.matches.length; i++)
    this._realpathSet(i, next)

  function next () {
    if (--n === 0)
      self._finish()
  }
}

Glob.prototype._realpathSet = function (index, cb) {
  var matchset = this.matches[index]
  if (!matchset)
    return cb()

  var found = Object.keys(matchset)
  var self = this
  var n = found.length

  if (n === 0)
    return cb()

  var set = this.matches[index] = Object.create(null)
  found.forEach(function (p, i) {
    // If there's a problem with the stat, then it means that
    // one or more of the links in the realpath couldn't be
    // resolved.  just return the abs value in that case.
    p = self._makeAbs(p)
    fs.realpath(p, self.realpathCache, function (er, real) {
      if (!er)
        set[real] = true
      else if (er.syscall === 'stat')
        set[p] = true
      else
        self.emit('error', er) // srsly wtf right here

      if (--n === 0) {
        self.matches[index] = set
        cb()
      }
    })
  })
}

Glob.prototype._mark = function (p) {
  return common.mark(this, p)
}

Glob.prototype._makeAbs = function (f) {
  return common.makeAbs(this, f)
}

Glob.prototype.abort = function () {
  this.aborted = true
  this.emit('abort')
}

Glob.prototype.pause = function () {
  if (!this.paused) {
    this.paused = true
    this.emit('pause')
  }
}

Glob.prototype.resume = function () {
  if (this.paused) {
    this.emit('resume')
    this.paused = false
    if (this._emitQueue.length) {
      var eq = this._emitQueue.slice(0)
      this._emitQueue.length = 0
      for (var i = 0; i < eq.length; i ++) {
        var e = eq[i]
        this._emitMatch(e[0], e[1])
      }
    }
    if (this._processQueue.length) {
      var pq = this._processQueue.slice(0)
      this._processQueue.length = 0
      for (var i = 0; i < pq.length; i ++) {
        var p = pq[i]
        this._processing--
        this._process(p[0], p[1], p[2], p[3])
      }
    }
  }
}

Glob.prototype._process = function (pattern, index, inGlobStar, cb) {
  assert(this instanceof Glob)
  assert(typeof cb === 'function')

  if (this.aborted)
    return

  this._processing++
  if (this.paused) {
    this._processQueue.push([pattern, index, inGlobStar, cb])
    return
  }

  //console.error('PROCESS %d', this._processing, pattern)

  // Get the first [n] parts of pattern that are all strings.
  var n = 0
  while (typeof pattern[n] === 'string') {
    n ++
  }
  // now n is the index of the first one that is *not* a string.

  // see if there's anything else
  var prefix
  switch (n) {
    // if not, then this is rather simple
    case pattern.length:
      this._processSimple(pattern.join('/'), index, cb)
      return

    case 0:
      // pattern *starts* with some non-trivial item.
      // going to readdir(cwd), but not include the prefix in matches.
      prefix = null
      break

    default:
      // pattern has some string bits in the front.
      // whatever it starts with, whether that's 'absolute' like /foo/bar,
      // or 'relative' like '../baz'
      prefix = pattern.slice(0, n).join('/')
      break
  }

  var remain = pattern.slice(n)

  // get the list of entries.
  var read
  if (prefix === null)
    read = '.'
  else if (isAbsolute(prefix) || isAbsolute(pattern.join('/'))) {
    if (!prefix || !isAbsolute(prefix))
      prefix = '/' + prefix
    read = prefix
  } else
    read = prefix

  var abs = this._makeAbs(read)

  //if ignored, skip _processing
  if (childrenIgnored(this, read))
    return cb()

  var isGlobStar = remain[0] === minimatch.GLOBSTAR
  if (isGlobStar)
    this._processGlobStar(prefix, read, abs, remain, index, inGlobStar, cb)
  else
    this._processReaddir(prefix, read, abs, remain, index, inGlobStar, cb)
}

Glob.prototype._processReaddir = function (prefix, read, abs, remain, index, inGlobStar, cb) {
  var self = this
  this._readdir(abs, inGlobStar, function (er, entries) {
    return self._processReaddir2(prefix, read, abs, remain, index, inGlobStar, entries, cb)
  })
}

Glob.prototype._processReaddir2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {

  // if the abs isn't a dir, then nothing can match!
  if (!entries)
    return cb()

  // It will only match dot entries if it starts with a dot, or if
  // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
  var pn = remain[0]
  var negate = !!this.minimatch.negate
  var rawGlob = pn._glob
  var dotOk = this.dot || rawGlob.charAt(0) === '.'

  var matchedEntries = []
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    if (e.charAt(0) !== '.' || dotOk) {
      var m
      if (negate && !prefix) {
        m = !e.match(pn)
      } else {
        m = e.match(pn)
      }
      if (m)
        matchedEntries.push(e)
    }
  }

  //console.error('prd2', prefix, entries, remain[0]._glob, matchedEntries)

  var len = matchedEntries.length
  // If there are no matched entries, then nothing matches.
  if (len === 0)
    return cb()

  // if this is the last remaining pattern bit, then no need for
  // an additional stat *unless* the user has specified mark or
  // stat explicitly.  We know they exist, since readdir returned
  // them.

  if (remain.length === 1 && !this.mark && !this.stat) {
    if (!this.matches[index])
      this.matches[index] = Object.create(null)

    for (var i = 0; i < len; i ++) {
      var e = matchedEntries[i]
      if (prefix) {
        if (prefix !== '/')
          e = prefix + '/' + e
        else
          e = prefix + e
      }

      if (e.charAt(0) === '/' && !this.nomount) {
        e = path.join(this.root, e)
      }
      this._emitMatch(index, e)
    }
    // This was the last one, and no stats were needed
    return cb()
  }

  // now test all matched entries as stand-ins for that part
  // of the pattern.
  remain.shift()
  for (var i = 0; i < len; i ++) {
    var e = matchedEntries[i]
    var newPattern
    if (prefix) {
      if (prefix !== '/')
        e = prefix + '/' + e
      else
        e = prefix + e
    }
    this._process([e].concat(remain), index, inGlobStar, cb)
  }
  cb()
}

Glob.prototype._emitMatch = function (index, e) {
  if (this.aborted)
    return

  if (this.matches[index][e])
    return

  if (isIgnored(this, e))
    return

  if (this.paused) {
    this._emitQueue.push([index, e])
    return
  }

  var abs = this._makeAbs(e)

  if (this.nodir) {
    var c = this.cache[abs]
    if (c === 'DIR' || Array.isArray(c))
      return
  }

  if (this.mark)
    e = this._mark(e)

  this.matches[index][e] = true

  var st = this.statCache[abs]
  if (st)
    this.emit('stat', e, st)

  this.emit('match', e)
}

Glob.prototype._readdirInGlobStar = function (abs, cb) {
  if (this.aborted)
    return

  // follow all symlinked directories forever
  // just proceed as if this is a non-globstar situation
  if (this.follow)
    return this._readdir(abs, false, cb)

  var lstatkey = 'lstat\0' + abs
  var self = this
  var lstatcb = inflight(lstatkey, lstatcb_)

  if (lstatcb)
    fs.lstat(abs, lstatcb)

  function lstatcb_ (er, lstat) {
    if (er)
      return cb()

    var isSym = lstat.isSymbolicLink()
    self.symlinks[abs] = isSym

    // If it's not a symlink or a dir, then it's definitely a regular file.
    // don't bother doing a readdir in that case.
    if (!isSym && !lstat.isDirectory()) {
      self.cache[abs] = 'FILE'
      cb()
    } else
      self._readdir(abs, false, cb)
  }
}

Glob.prototype._readdir = function (abs, inGlobStar, cb) {
  if (this.aborted)
    return

  cb = inflight('readdir\0'+abs+'\0'+inGlobStar, cb)
  if (!cb)
    return

  //console.error('RD %j %j', +inGlobStar, abs)
  if (inGlobStar && !ownProp(this.symlinks, abs))
    return this._readdirInGlobStar(abs, cb)

  if (ownProp(this.cache, abs)) {
    var c = this.cache[abs]
    if (!c || c === 'FILE')
      return cb()

    if (Array.isArray(c))
      return cb(null, c)
  }

  var self = this
  fs.readdir(abs, readdirCb(this, abs, cb))
}

function readdirCb (self, abs, cb) {
  return function (er, entries) {
    if (er)
      self._readdirError(abs, er, cb)
    else
      self._readdirEntries(abs, entries, cb)
  }
}

Glob.prototype._readdirEntries = function (abs, entries, cb) {
  if (this.aborted)
    return

  // if we haven't asked to stat everything, then just
  // assume that everything in there exists, so we can avoid
  // having to stat it a second time.
  if (!this.mark && !this.stat) {
    for (var i = 0; i < entries.length; i ++) {
      var e = entries[i]
      if (abs === '/')
        e = abs + e
      else
        e = abs + '/' + e
      this.cache[e] = true
    }
  }

  this.cache[abs] = entries
  return cb(null, entries)
}

Glob.prototype._readdirError = function (f, er, cb) {
  if (this.aborted)
    return

  // handle errors, and cache the information
  switch (er.code) {
    case 'ENOTSUP': // https://github.com/isaacs/node-glob/issues/205
    case 'ENOTDIR': // totally normal. means it *does* exist.
      this.cache[this._makeAbs(f)] = 'FILE'
      if (f === this.cwd) {
        var error = new Error(er.code + ' invalid cwd ' + f)
        error.path = f
        error.code = er.code
        this.emit('error', error)
        this.abort()
      }
      break

    case 'ENOENT': // not terribly unusual
    case 'ELOOP':
    case 'ENAMETOOLONG':
    case 'UNKNOWN':
      this.cache[this._makeAbs(f)] = false
      break

    default: // some unusual error.  Treat as failure.
      this.cache[this._makeAbs(f)] = false
      if (this.strict) {
        this.emit('error', er)
        // If the error is handled, then we abort
        // if not, we threw out of here
        this.abort()
      }
      if (!this.silent)
        console.error('glob error', er)
      break
  }

  return cb()
}

Glob.prototype._processGlobStar = function (prefix, read, abs, remain, index, inGlobStar, cb) {
  var self = this
  this._readdir(abs, inGlobStar, function (er, entries) {
    self._processGlobStar2(prefix, read, abs, remain, index, inGlobStar, entries, cb)
  })
}


Glob.prototype._processGlobStar2 = function (prefix, read, abs, remain, index, inGlobStar, entries, cb) {
  //console.error('pgs2', prefix, remain[0], entries)

  // no entries means not a dir, so it can never have matches
  // foo.txt/** doesn't match foo.txt
  if (!entries)
    return cb()

  // test without the globstar, and with every child both below
  // and replacing the globstar.
  var remainWithoutGlobStar = remain.slice(1)
  var gspref = prefix ? [ prefix ] : []
  var noGlobStar = gspref.concat(remainWithoutGlobStar)

  // the noGlobStar pattern exits the inGlobStar state
  this._process(noGlobStar, index, false, cb)

  var isSym = this.symlinks[abs]
  var len = entries.length

  // If it's a symlink, and we're in a globstar, then stop
  if (isSym && inGlobStar)
    return cb()

  for (var i = 0; i < len; i++) {
    var e = entries[i]
    if (e.charAt(0) === '.' && !this.dot)
      continue

    // these two cases enter the inGlobStar state
    var instead = gspref.concat(entries[i], remainWithoutGlobStar)
    this._process(instead, index, true, cb)

    var below = gspref.concat(entries[i], remain)
    this._process(below, index, true, cb)
  }

  cb()
}

Glob.prototype._processSimple = function (prefix, index, cb) {
  // XXX review this.  Shouldn't it be doing the mounting etc
  // before doing stat?  kinda weird?
  var self = this
  this._stat(prefix, function (er, exists) {
    self._processSimple2(prefix, index, er, exists, cb)
  })
}
Glob.prototype._processSimple2 = function (prefix, index, er, exists, cb) {

  //console.error('ps2', prefix, exists)

  if (!this.matches[index])
    this.matches[index] = Object.create(null)

  // If it doesn't exist, then just mark the lack of results
  if (!exists)
    return cb()

  if (prefix && isAbsolute(prefix) && !this.nomount) {
    var trail = /[\/\\]$/.test(prefix)
    if (prefix.charAt(0) === '/') {
      prefix = path.join(this.root, prefix)
    } else {
      prefix = path.resolve(this.root, prefix)
      if (trail)
        prefix += '/'
    }
  }

  if (process.platform === 'win32')
    prefix = prefix.replace(/\\/g, '/')

  // Mark this as a match
  this._emitMatch(index, prefix)
  cb()
}

// Returns either 'DIR', 'FILE', or false
Glob.prototype._stat = function (f, cb) {
  var abs = this._makeAbs(f)
  var needDir = f.slice(-1) === '/'

  if (f.length > this.maxLength)
    return cb()

  if (!this.stat && ownProp(this.cache, abs)) {
    var c = this.cache[abs]

    if (Array.isArray(c))
      c = 'DIR'

    // It exists, but maybe not how we need it
    if (!needDir || c === 'DIR')
      return cb(null, c)

    if (needDir && c === 'FILE')
      return cb()

    // otherwise we have to stat, because maybe c=true
    // if we know it exists, but not what it is.
  }

  var exists
  var stat = this.statCache[abs]
  if (stat !== undefined) {
    if (stat === false)
      return cb(null, stat)
    else {
      var type = stat.isDirectory() ? 'DIR' : 'FILE'
      if (needDir && type === 'FILE')
        return cb()
      else
        return cb(null, type, stat)
    }
  }

  var self = this
  var statcb = inflight('stat\0' + abs, lstatcb_)
  if (statcb)
    fs.lstat(abs, statcb)

  function lstatcb_ (er, lstat) {
    if (lstat && lstat.isSymbolicLink()) {
      // If it's a symlink, then treat it as the target, unless
      // the target does not exist, then treat it as a file.
      return fs.stat(abs, function (er, stat) {
        if (er)
          self._stat2(f, abs, null, lstat, cb)
        else
          self._stat2(f, abs, er, stat, cb)
      })
    } else {
      self._stat2(f, abs, er, lstat, cb)
    }
  }
}

Glob.prototype._stat2 = function (f, abs, er, stat, cb) {
  if (er) {
    this.statCache[abs] = false
    return cb()
  }

  var needDir = f.slice(-1) === '/'
  this.statCache[abs] = stat

  if (abs.slice(-1) === '/' && !stat.isDirectory())
    return cb(null, false, stat)

  var c = stat.isDirectory() ? 'DIR' : 'FILE'
  this.cache[abs] = this.cache[abs] || c

  if (needDir && c !== 'DIR')
    return cb()

  return cb(null, c, stat)
}

},{"./common.js":32,"./sync.js":43,"assert":undefined,"events":undefined,"fs":undefined,"inflight":34,"inherits":45,"minimatch":36,"once":41,"path":undefined,"path-is-absolute":42,"util":undefined}],34:[function(require,module,exports){
var wrappy = require('wrappy')
var reqs = Object.create(null)
var once = require('once')

module.exports = wrappy(inflight)

function inflight (key, cb) {
  if (reqs[key]) {
    reqs[key].push(cb)
    return null
  } else {
    reqs[key] = [cb]
    return makeres(key)
  }
}

function makeres (key) {
  return once(function RES () {
    var cbs = reqs[key]
    var len = cbs.length
    var args = slice(arguments)
    for (var i = 0; i < len; i++) {
      cbs[i].apply(null, args)
    }
    if (cbs.length > len) {
      // added more in the interim.
      // de-zalgo, just in case, but don't call again.
      cbs.splice(0, len)
      process.nextTick(function () {
        RES.apply(null, args)
      })
    } else {
      delete reqs[key]
    }
  })
}

function slice (args) {
  var length = args.length
  var array = []

  for (var i = 0; i < length; i++) array[i] = args[i]
  return array
}

},{"once":41,"wrappy":35}],35:[function(require,module,exports){
// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}

},{}],36:[function(require,module,exports){
module.exports = minimatch
minimatch.Minimatch = Minimatch

var path = { sep: '/' }
try {
  path = require('path')
} catch (er) {}

var GLOBSTAR = minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {}
var expand = require('brace-expansion')

// any single thing other than /
// don't need to escape / when using new RegExp()
var qmark = '[^/]'

// * => any number of characters
var star = qmark + '*?'

// ** when dots are allowed.  Anything goes, except .. and .
// not (^ or / followed by one or two dots followed by $ or /),
// followed by anything, any number of times.
var twoStarDot = '(?:(?!(?:\\\/|^)(?:\\.{1,2})($|\\\/)).)*?'

// not a ^ or / followed by a dot,
// followed by anything, any number of times.
var twoStarNoDot = '(?:(?!(?:\\\/|^)\\.).)*?'

// characters that need to be escaped in RegExp.
var reSpecials = charSet('().*{}+?[]^$\\!')

// "abc" -> { a:true, b:true, c:true }
function charSet (s) {
  return s.split('').reduce(function (set, c) {
    set[c] = true
    return set
  }, {})
}

// normalizes slashes.
var slashSplit = /\/+/

minimatch.filter = filter
function filter (pattern, options) {
  options = options || {}
  return function (p, i, list) {
    return minimatch(p, pattern, options)
  }
}

function ext (a, b) {
  a = a || {}
  b = b || {}
  var t = {}
  Object.keys(b).forEach(function (k) {
    t[k] = b[k]
  })
  Object.keys(a).forEach(function (k) {
    t[k] = a[k]
  })
  return t
}

minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return minimatch

  var orig = minimatch

  var m = function minimatch (p, pattern, options) {
    return orig.minimatch(p, pattern, ext(def, options))
  }

  m.Minimatch = function Minimatch (pattern, options) {
    return new orig.Minimatch(pattern, ext(def, options))
  }

  return m
}

Minimatch.defaults = function (def) {
  if (!def || !Object.keys(def).length) return Minimatch
  return minimatch.defaults(def).Minimatch
}

function minimatch (p, pattern, options) {
  if (typeof pattern !== 'string') {
    throw new TypeError('glob pattern string required')
  }

  if (!options) options = {}

  // shortcut: comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === '#') {
    return false
  }

  // "" only matches ""
  if (pattern.trim() === '') return p === ''

  return new Minimatch(pattern, options).match(p)
}

function Minimatch (pattern, options) {
  if (!(this instanceof Minimatch)) {
    return new Minimatch(pattern, options)
  }

  if (typeof pattern !== 'string') {
    throw new TypeError('glob pattern string required')
  }

  if (!options) options = {}
  pattern = pattern.trim()

  // windows support: need to use /, not \
  if (path.sep !== '/') {
    pattern = pattern.split(path.sep).join('/')
  }

  this.options = options
  this.set = []
  this.pattern = pattern
  this.regexp = null
  this.negate = false
  this.comment = false
  this.empty = false

  // make the set of regexps etc.
  this.make()
}

Minimatch.prototype.debug = function () {}

Minimatch.prototype.make = make
function make () {
  // don't do it more than once.
  if (this._made) return

  var pattern = this.pattern
  var options = this.options

  // empty patterns and comments match nothing.
  if (!options.nocomment && pattern.charAt(0) === '#') {
    this.comment = true
    return
  }
  if (!pattern) {
    this.empty = true
    return
  }

  // step 1: figure out negation, etc.
  this.parseNegate()

  // step 2: expand braces
  var set = this.globSet = this.braceExpand()

  if (options.debug) this.debug = console.error

  this.debug(this.pattern, set)

  // step 3: now we have a set, so turn each one into a series of path-portion
  // matching patterns.
  // These will be regexps, except in the case of "**", which is
  // set to the GLOBSTAR object for globstar behavior,
  // and will not contain any / characters
  set = this.globParts = set.map(function (s) {
    return s.split(slashSplit)
  })

  this.debug(this.pattern, set)

  // glob --> regexps
  set = set.map(function (s, si, set) {
    return s.map(this.parse, this)
  }, this)

  this.debug(this.pattern, set)

  // filter out everything that didn't compile properly.
  set = set.filter(function (s) {
    return s.indexOf(false) === -1
  })

  this.debug(this.pattern, set)

  this.set = set
}

Minimatch.prototype.parseNegate = parseNegate
function parseNegate () {
  var pattern = this.pattern
  var negate = false
  var options = this.options
  var negateOffset = 0

  if (options.nonegate) return

  for (var i = 0, l = pattern.length
    ; i < l && pattern.charAt(i) === '!'
    ; i++) {
    negate = !negate
    negateOffset++
  }

  if (negateOffset) this.pattern = pattern.substr(negateOffset)
  this.negate = negate
}

// Brace expansion:
// a{b,c}d -> abd acd
// a{b,}c -> abc ac
// a{0..3}d -> a0d a1d a2d a3d
// a{b,c{d,e}f}g -> abg acdfg acefg
// a{b,c}d{e,f}g -> abdeg acdeg abdeg abdfg
//
// Invalid sets are not expanded.
// a{2..}b -> a{2..}b
// a{b}c -> a{b}c
minimatch.braceExpand = function (pattern, options) {
  return braceExpand(pattern, options)
}

Minimatch.prototype.braceExpand = braceExpand

function braceExpand (pattern, options) {
  if (!options) {
    if (this instanceof Minimatch) {
      options = this.options
    } else {
      options = {}
    }
  }

  pattern = typeof pattern === 'undefined'
    ? this.pattern : pattern

  if (typeof pattern === 'undefined') {
    throw new Error('undefined pattern')
  }

  if (options.nobrace ||
    !pattern.match(/\{.*\}/)) {
    // shortcut. no need to expand.
    return [pattern]
  }

  return expand(pattern)
}

// parse a component of the expanded set.
// At this point, no pattern may contain "/" in it
// so we're going to return a 2d array, where each entry is the full
// pattern, split on '/', and then turned into a regular expression.
// A regexp is made at the end which joins each array with an
// escaped /, and another full one which joins each regexp with |.
//
// Following the lead of Bash 4.1, note that "**" only has special meaning
// when it is the *only* thing in a path portion.  Otherwise, any series
// of * is equivalent to a single *.  Globstar behavior is enabled by
// default, and can be disabled by setting options.noglobstar.
Minimatch.prototype.parse = parse
var SUBPARSE = {}
function parse (pattern, isSub) {
  var options = this.options

  // shortcuts
  if (!options.noglobstar && pattern === '**') return GLOBSTAR
  if (pattern === '') return ''

  var re = ''
  var hasMagic = !!options.nocase
  var escaping = false
  // ? => one single character
  var patternListStack = []
  var negativeLists = []
  var plType
  var stateChar
  var inClass = false
  var reClassStart = -1
  var classStart = -1
  // . and .. never match anything that doesn't start with .,
  // even when options.dot is set.
  var patternStart = pattern.charAt(0) === '.' ? '' // anything
  // not (start or / followed by . or .. followed by / or end)
  : options.dot ? '(?!(?:^|\\\/)\\.{1,2}(?:$|\\\/))'
  : '(?!\\.)'
  var self = this

  function clearStateChar () {
    if (stateChar) {
      // we had some state-tracking character
      // that wasn't consumed by this pass.
      switch (stateChar) {
        case '*':
          re += star
          hasMagic = true
        break
        case '?':
          re += qmark
          hasMagic = true
        break
        default:
          re += '\\' + stateChar
        break
      }
      self.debug('clearStateChar %j %j', stateChar, re)
      stateChar = false
    }
  }

  for (var i = 0, len = pattern.length, c
    ; (i < len) && (c = pattern.charAt(i))
    ; i++) {
    this.debug('%s\t%s %s %j', pattern, i, re, c)

    // skip over any that are escaped.
    if (escaping && reSpecials[c]) {
      re += '\\' + c
      escaping = false
      continue
    }

    switch (c) {
      case '/':
        // completely not allowed, even escaped.
        // Should already be path-split by now.
        return false

      case '\\':
        clearStateChar()
        escaping = true
      continue

      // the various stateChar values
      // for the "extglob" stuff.
      case '?':
      case '*':
      case '+':
      case '@':
      case '!':
        this.debug('%s\t%s %s %j <-- stateChar', pattern, i, re, c)

        // all of those are literals inside a class, except that
        // the glob [!a] means [^a] in regexp
        if (inClass) {
          this.debug('  in class')
          if (c === '!' && i === classStart + 1) c = '^'
          re += c
          continue
        }

        // if we already have a stateChar, then it means
        // that there was something like ** or +? in there.
        // Handle the stateChar, then proceed with this one.
        self.debug('call clearStateChar %j', stateChar)
        clearStateChar()
        stateChar = c
        // if extglob is disabled, then +(asdf|foo) isn't a thing.
        // just clear the statechar *now*, rather than even diving into
        // the patternList stuff.
        if (options.noext) clearStateChar()
      continue

      case '(':
        if (inClass) {
          re += '('
          continue
        }

        if (!stateChar) {
          re += '\\('
          continue
        }

        plType = stateChar
        patternListStack.push({
          type: plType,
          start: i - 1,
          reStart: re.length
        })
        // negation is (?:(?!js)[^/]*)
        re += stateChar === '!' ? '(?:(?!(?:' : '(?:'
        this.debug('plType %j %j', stateChar, re)
        stateChar = false
      continue

      case ')':
        if (inClass || !patternListStack.length) {
          re += '\\)'
          continue
        }

        clearStateChar()
        hasMagic = true
        re += ')'
        var pl = patternListStack.pop()
        plType = pl.type
        // negation is (?:(?!js)[^/]*)
        // The others are (?:<pattern>)<type>
        switch (plType) {
          case '!':
            negativeLists.push(pl)
            re += ')[^/]*?)'
            pl.reEnd = re.length
            break
          case '?':
          case '+':
          case '*':
            re += plType
            break
          case '@': break // the default anyway
        }
      continue

      case '|':
        if (inClass || !patternListStack.length || escaping) {
          re += '\\|'
          escaping = false
          continue
        }

        clearStateChar()
        re += '|'
      continue

      // these are mostly the same in regexp and glob
      case '[':
        // swallow any state-tracking char before the [
        clearStateChar()

        if (inClass) {
          re += '\\' + c
          continue
        }

        inClass = true
        classStart = i
        reClassStart = re.length
        re += c
      continue

      case ']':
        //  a right bracket shall lose its special
        //  meaning and represent itself in
        //  a bracket expression if it occurs
        //  first in the list.  -- POSIX.2 2.8.3.2
        if (i === classStart + 1 || !inClass) {
          re += '\\' + c
          escaping = false
          continue
        }

        // handle the case where we left a class open.
        // "[z-a]" is valid, equivalent to "\[z-a\]"
        if (inClass) {
          // split where the last [ was, make sure we don't have
          // an invalid re. if so, re-walk the contents of the
          // would-be class to re-translate any characters that
          // were passed through as-is
          // TODO: It would probably be faster to determine this
          // without a try/catch and a new RegExp, but it's tricky
          // to do safely.  For now, this is safe and works.
          var cs = pattern.substring(classStart + 1, i)
          try {
            RegExp('[' + cs + ']')
          } catch (er) {
            // not a valid class!
            var sp = this.parse(cs, SUBPARSE)
            re = re.substr(0, reClassStart) + '\\[' + sp[0] + '\\]'
            hasMagic = hasMagic || sp[1]
            inClass = false
            continue
          }
        }

        // finish up the class.
        hasMagic = true
        inClass = false
        re += c
      continue

      default:
        // swallow any state char that wasn't consumed
        clearStateChar()

        if (escaping) {
          // no need
          escaping = false
        } else if (reSpecials[c]
          && !(c === '^' && inClass)) {
          re += '\\'
        }

        re += c

    } // switch
  } // for

  // handle the case where we left a class open.
  // "[abc" is valid, equivalent to "\[abc"
  if (inClass) {
    // split where the last [ was, and escape it
    // this is a huge pita.  We now have to re-walk
    // the contents of the would-be class to re-translate
    // any characters that were passed through as-is
    cs = pattern.substr(classStart + 1)
    sp = this.parse(cs, SUBPARSE)
    re = re.substr(0, reClassStart) + '\\[' + sp[0]
    hasMagic = hasMagic || sp[1]
  }

  // handle the case where we had a +( thing at the *end*
  // of the pattern.
  // each pattern list stack adds 3 chars, and we need to go through
  // and escape any | chars that were passed through as-is for the regexp.
  // Go through and escape them, taking care not to double-escape any
  // | chars that were already escaped.
  for (pl = patternListStack.pop(); pl; pl = patternListStack.pop()) {
    var tail = re.slice(pl.reStart + 3)
    // maybe some even number of \, then maybe 1 \, followed by a |
    tail = tail.replace(/((?:\\{2})*)(\\?)\|/g, function (_, $1, $2) {
      if (!$2) {
        // the | isn't already escaped, so escape it.
        $2 = '\\'
      }

      // need to escape all those slashes *again*, without escaping the
      // one that we need for escaping the | character.  As it works out,
      // escaping an even number of slashes can be done by simply repeating
      // it exactly after itself.  That's why this trick works.
      //
      // I am sorry that you have to see this.
      return $1 + $1 + $2 + '|'
    })

    this.debug('tail=%j\n   %s', tail, tail)
    var t = pl.type === '*' ? star
      : pl.type === '?' ? qmark
      : '\\' + pl.type

    hasMagic = true
    re = re.slice(0, pl.reStart) + t + '\\(' + tail
  }

  // handle trailing things that only matter at the very end.
  clearStateChar()
  if (escaping) {
    // trailing \\
    re += '\\\\'
  }

  // only need to apply the nodot start if the re starts with
  // something that could conceivably capture a dot
  var addPatternStart = false
  switch (re.charAt(0)) {
    case '.':
    case '[':
    case '(': addPatternStart = true
  }

  // Hack to work around lack of negative lookbehind in JS
  // A pattern like: *.!(x).!(y|z) needs to ensure that a name
  // like 'a.xyz.yz' doesn't match.  So, the first negative
  // lookahead, has to look ALL the way ahead, to the end of
  // the pattern.
  for (var n = negativeLists.length - 1; n > -1; n--) {
    var nl = negativeLists[n]

    var nlBefore = re.slice(0, nl.reStart)
    var nlFirst = re.slice(nl.reStart, nl.reEnd - 8)
    var nlLast = re.slice(nl.reEnd - 8, nl.reEnd)
    var nlAfter = re.slice(nl.reEnd)

    nlLast += nlAfter

    // Handle nested stuff like *(*.js|!(*.json)), where open parens
    // mean that we should *not* include the ) in the bit that is considered
    // "after" the negated section.
    var openParensBefore = nlBefore.split('(').length - 1
    var cleanAfter = nlAfter
    for (i = 0; i < openParensBefore; i++) {
      cleanAfter = cleanAfter.replace(/\)[+*?]?/, '')
    }
    nlAfter = cleanAfter

    var dollar = ''
    if (nlAfter === '' && isSub !== SUBPARSE) {
      dollar = '$'
    }
    var newRe = nlBefore + nlFirst + nlAfter + dollar + nlLast
    re = newRe
  }

  // if the re is not "" at this point, then we need to make sure
  // it doesn't match against an empty path part.
  // Otherwise a/* will match a/, which it should not.
  if (re !== '' && hasMagic) {
    re = '(?=.)' + re
  }

  if (addPatternStart) {
    re = patternStart + re
  }

  // parsing just a piece of a larger pattern.
  if (isSub === SUBPARSE) {
    return [re, hasMagic]
  }

  // skip the regexp for non-magical patterns
  // unescape anything in it, though, so that it'll be
  // an exact match against a file etc.
  if (!hasMagic) {
    return globUnescape(pattern)
  }

  var flags = options.nocase ? 'i' : ''
  var regExp = new RegExp('^' + re + '$', flags)

  regExp._glob = pattern
  regExp._src = re

  return regExp
}

minimatch.makeRe = function (pattern, options) {
  return new Minimatch(pattern, options || {}).makeRe()
}

Minimatch.prototype.makeRe = makeRe
function makeRe () {
  if (this.regexp || this.regexp === false) return this.regexp

  // at this point, this.set is a 2d array of partial
  // pattern strings, or "**".
  //
  // It's better to use .match().  This function shouldn't
  // be used, really, but it's pretty convenient sometimes,
  // when you just want to work with a regex.
  var set = this.set

  if (!set.length) {
    this.regexp = false
    return this.regexp
  }
  var options = this.options

  var twoStar = options.noglobstar ? star
    : options.dot ? twoStarDot
    : twoStarNoDot
  var flags = options.nocase ? 'i' : ''

  var re = set.map(function (pattern) {
    return pattern.map(function (p) {
      return (p === GLOBSTAR) ? twoStar
      : (typeof p === 'string') ? regExpEscape(p)
      : p._src
    }).join('\\\/')
  }).join('|')

  // must match entire pattern
  // ending in a * or ** will make it less strict.
  re = '^(?:' + re + ')$'

  // can match anything, as long as it's not this.
  if (this.negate) re = '^(?!' + re + ').*$'

  try {
    this.regexp = new RegExp(re, flags)
  } catch (ex) {
    this.regexp = false
  }
  return this.regexp
}

minimatch.match = function (list, pattern, options) {
  options = options || {}
  var mm = new Minimatch(pattern, options)
  list = list.filter(function (f) {
    return mm.match(f)
  })
  if (mm.options.nonull && !list.length) {
    list.push(pattern)
  }
  return list
}

Minimatch.prototype.match = match
function match (f, partial) {
  this.debug('match', f, this.pattern)
  // short-circuit in the case of busted things.
  // comments, etc.
  if (this.comment) return false
  if (this.empty) return f === ''

  if (f === '/' && partial) return true

  var options = this.options

  // windows: need to use /, not \
  if (path.sep !== '/') {
    f = f.split(path.sep).join('/')
  }

  // treat the test path as a set of pathparts.
  f = f.split(slashSplit)
  this.debug(this.pattern, 'split', f)

  // just ONE of the pattern sets in this.set needs to match
  // in order for it to be valid.  If negating, then just one
  // match means that we have failed.
  // Either way, return on the first hit.

  var set = this.set
  this.debug(this.pattern, 'set', set)

  // Find the basename of the path by looking for the last non-empty segment
  var filename
  var i
  for (i = f.length - 1; i >= 0; i--) {
    filename = f[i]
    if (filename) break
  }

  for (i = 0; i < set.length; i++) {
    var pattern = set[i]
    var file = f
    if (options.matchBase && pattern.length === 1) {
      file = [filename]
    }
    var hit = this.matchOne(file, pattern, partial)
    if (hit) {
      if (options.flipNegate) return true
      return !this.negate
    }
  }

  // didn't get any hits.  this is success if it's a negative
  // pattern, failure otherwise.
  if (options.flipNegate) return false
  return this.negate
}

// set partial to true to test if, for example,
// "/a/b" matches the start of "/*/b/*/d"
// Partial means, if you run out of file before you run
// out of pattern, then that's fine, as long as all
// the parts match.
Minimatch.prototype.matchOne = function (file, pattern, partial) {
  var options = this.options

  this.debug('matchOne',
    { 'this': this, file: file, pattern: pattern })

  this.debug('matchOne', file.length, pattern.length)

  for (var fi = 0,
      pi = 0,
      fl = file.length,
      pl = pattern.length
      ; (fi < fl) && (pi < pl)
      ; fi++, pi++) {
    this.debug('matchOne loop')
    var p = pattern[pi]
    var f = file[fi]

    this.debug(pattern, p, f)

    // should be impossible.
    // some invalid regexp stuff in the set.
    if (p === false) return false

    if (p === GLOBSTAR) {
      this.debug('GLOBSTAR', [pattern, p, f])

      // "**"
      // a/**/b/**/c would match the following:
      // a/b/x/y/z/c
      // a/x/y/z/b/c
      // a/b/x/b/x/c
      // a/b/c
      // To do this, take the rest of the pattern after
      // the **, and see if it would match the file remainder.
      // If so, return success.
      // If not, the ** "swallows" a segment, and try again.
      // This is recursively awful.
      //
      // a/**/b/**/c matching a/b/x/y/z/c
      // - a matches a
      // - doublestar
      //   - matchOne(b/x/y/z/c, b/**/c)
      //     - b matches b
      //     - doublestar
      //       - matchOne(x/y/z/c, c) -> no
      //       - matchOne(y/z/c, c) -> no
      //       - matchOne(z/c, c) -> no
      //       - matchOne(c, c) yes, hit
      var fr = fi
      var pr = pi + 1
      if (pr === pl) {
        this.debug('** at the end')
        // a ** at the end will just swallow the rest.
        // We have found a match.
        // however, it will not swallow /.x, unless
        // options.dot is set.
        // . and .. are *never* matched by **, for explosively
        // exponential reasons.
        for (; fi < fl; fi++) {
          if (file[fi] === '.' || file[fi] === '..' ||
            (!options.dot && file[fi].charAt(0) === '.')) return false
        }
        return true
      }

      // ok, let's see if we can swallow whatever we can.
      while (fr < fl) {
        var swallowee = file[fr]

        this.debug('\nglobstar while', file, fr, pattern, pr, swallowee)

        // XXX remove this slice.  Just pass the start index.
        if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
          this.debug('globstar found match!', fr, fl, swallowee)
          // found a match.
          return true
        } else {
          // can't swallow "." or ".." ever.
          // can only swallow ".foo" when explicitly asked.
          if (swallowee === '.' || swallowee === '..' ||
            (!options.dot && swallowee.charAt(0) === '.')) {
            this.debug('dot detected!', file, fr, pattern, pr)
            break
          }

          // ** swallows a segment, and continue.
          this.debug('globstar swallow a segment, and continue')
          fr++
        }
      }

      // no match was found.
      // However, in partial mode, we can't say this is necessarily over.
      // If there's more *pattern* left, then
      if (partial) {
        // ran out of file
        this.debug('\n>>> no match, partial?', file, fr, pattern, pr)
        if (fr === fl) return true
      }
      return false
    }

    // something other than **
    // non-magic patterns just have to match exactly
    // patterns with magic have been turned into regexps.
    var hit
    if (typeof p === 'string') {
      if (options.nocase) {
        hit = f.toLowerCase() === p.toLowerCase()
      } else {
        hit = f === p
      }
      this.debug('string match', p, f, hit)
    } else {
      hit = f.match(p)
      this.debug('pattern match', p, f, hit)
    }

    if (!hit) return false
  }

  // Note: ending in / means that we'll get a final ""
  // at the end of the pattern.  This can only match a
  // corresponding "" at the end of the file.
  // If the file ends in /, then it can only match a
  // a pattern that ends in /, unless the pattern just
  // doesn't have any more for it. But, a/b/ should *not*
  // match "a/b/*", even though "" matches against the
  // [^/]*? pattern, except in partial mode, where it might
  // simply not be reached yet.
  // However, a/b/ should still satisfy a/*

  // now either we fell off the end of the pattern, or we're done.
  if (fi === fl && pi === pl) {
    // ran out of pattern and filename at the same time.
    // an exact hit!
    return true
  } else if (fi === fl) {
    // ran out of file, but still had pattern left.
    // this is ok if we're doing the match as part of
    // a glob fs traversal.
    return partial
  } else if (pi === pl) {
    // ran out of pattern, still have file left.
    // this is only acceptable if we're on the very last
    // empty segment of a file with a trailing slash.
    // a/* should match a/b/
    var emptyFileEnd = (fi === fl - 1) && (file[fi] === '')
    return emptyFileEnd
  }

  // should be unreachable.
  throw new Error('wtf?')
}

// replace stuff like \* with *
function globUnescape (s) {
  return s.replace(/\\(.)/g, '$1')
}

function regExpEscape (s) {
  return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}

},{"brace-expansion":37,"path":undefined}],37:[function(require,module,exports){
var concatMap = require('concat-map');
var balanced = require('balanced-match');

module.exports = expandTop;

var escSlash = '\0SLASH'+Math.random()+'\0';
var escOpen = '\0OPEN'+Math.random()+'\0';
var escClose = '\0CLOSE'+Math.random()+'\0';
var escComma = '\0COMMA'+Math.random()+'\0';
var escPeriod = '\0PERIOD'+Math.random()+'\0';

function numeric(str) {
  return parseInt(str, 10) == str
    ? parseInt(str, 10)
    : str.charCodeAt(0);
}

function escapeBraces(str) {
  return str.split('\\\\').join(escSlash)
            .split('\\{').join(escOpen)
            .split('\\}').join(escClose)
            .split('\\,').join(escComma)
            .split('\\.').join(escPeriod);
}

function unescapeBraces(str) {
  return str.split(escSlash).join('\\')
            .split(escOpen).join('{')
            .split(escClose).join('}')
            .split(escComma).join(',')
            .split(escPeriod).join('.');
}


// Basically just str.split(","), but handling cases
// where we have nested braced sections, which should be
// treated as individual members, like {a,{b,c},d}
function parseCommaParts(str) {
  if (!str)
    return [''];

  var parts = [];
  var m = balanced('{', '}', str);

  if (!m)
    return str.split(',');

  var pre = m.pre;
  var body = m.body;
  var post = m.post;
  var p = pre.split(',');

  p[p.length-1] += '{' + body + '}';
  var postParts = parseCommaParts(post);
  if (post.length) {
    p[p.length-1] += postParts.shift();
    p.push.apply(p, postParts);
  }

  parts.push.apply(parts, p);

  return parts;
}

function expandTop(str) {
  if (!str)
    return [];

  return expand(escapeBraces(str), true).map(unescapeBraces);
}

function identity(e) {
  return e;
}

function embrace(str) {
  return '{' + str + '}';
}
function isPadded(el) {
  return /^-?0\d/.test(el);
}

function lte(i, y) {
  return i <= y;
}
function gte(i, y) {
  return i >= y;
}

function expand(str, isTop) {
  var expansions = [];

  var m = balanced('{', '}', str);
  if (!m || /\$$/.test(m.pre)) return [str];

  var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
  var isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
  var isSequence = isNumericSequence || isAlphaSequence;
  var isOptions = /^(.*,)+(.+)?$/.test(m.body);
  if (!isSequence && !isOptions) {
    // {a},b}
    if (m.post.match(/,.*\}/)) {
      str = m.pre + '{' + m.body + escClose + m.post;
      return expand(str);
    }
    return [str];
  }

  var n;
  if (isSequence) {
    n = m.body.split(/\.\./);
  } else {
    n = parseCommaParts(m.body);
    if (n.length === 1) {
      // x{{a,b}}y ==> x{a}y x{b}y
      n = expand(n[0], false).map(embrace);
      if (n.length === 1) {
        var post = m.post.length
          ? expand(m.post, false)
          : [''];
        return post.map(function(p) {
          return m.pre + n[0] + p;
        });
      }
    }
  }

  // at this point, n is the parts, and we know it's not a comma set
  // with a single entry.

  // no need to expand pre, since it is guaranteed to be free of brace-sets
  var pre = m.pre;
  var post = m.post.length
    ? expand(m.post, false)
    : [''];

  var N;

  if (isSequence) {
    var x = numeric(n[0]);
    var y = numeric(n[1]);
    var width = Math.max(n[0].length, n[1].length)
    var incr = n.length == 3
      ? Math.abs(numeric(n[2]))
      : 1;
    var test = lte;
    var reverse = y < x;
    if (reverse) {
      incr *= -1;
      test = gte;
    }
    var pad = n.some(isPadded);

    N = [];

    for (var i = x; test(i, y); i += incr) {
      var c;
      if (isAlphaSequence) {
        c = String.fromCharCode(i);
        if (c === '\\')
          c = '';
      } else {
        c = String(i);
        if (pad) {
          var need = width - c.length;
          if (need > 0) {
            var z = new Array(need + 1).join('0');
            if (i < 0)
              c = '-' + z + c.slice(1);
            else
              c = z + c;
          }
        }
      }
      N.push(c);
    }
  } else {
    N = concatMap(n, function(el) { return expand(el, false) });
  }

  for (var j = 0; j < N.length; j++) {
    for (var k = 0; k < post.length; k++) {
      var expansion = pre + N[j] + post[k];
      if (!isTop || isSequence || expansion)
        expansions.push(expansion);
    }
  }

  return expansions;
}


},{"balanced-match":38,"concat-map":39}],38:[function(require,module,exports){
module.exports = balanced;
function balanced(a, b, str) {
  var r = range(a, b, str);

  return r && {
    start: r[0],
    end: r[1],
    pre: str.slice(0, r[0]),
    body: str.slice(r[0] + a.length, r[1]),
    post: str.slice(r[1] + b.length)
  };
}

balanced.range = range;
function range(a, b, str) {
  var begs, beg, left, right, result;
  var ai = str.indexOf(a);
  var bi = str.indexOf(b, ai + 1);
  var i = ai;

  if (ai >= 0 && bi > 0) {
    begs = [];
    left = str.length;

    while (i < str.length && i >= 0 && ! result) {
      if (i == ai) {
        begs.push(i);
        ai = str.indexOf(a, i + 1);
      } else if (begs.length == 1) {
        result = [ begs.pop(), bi ];
      } else {
        beg = begs.pop();
        if (beg < left) {
          left = beg;
          right = bi;
        }

        bi = str.indexOf(b, i + 1);
      }

      i = ai < bi && ai >= 0 ? ai : bi;
    }

    if (begs.length) {
      result = [ left, right ];
    }
  }

  return result;
}

},{}],39:[function(require,module,exports){
module.exports = function (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        var x = fn(xs[i], i);
        if (isArray(x)) res.push.apply(res, x);
        else res.push(x);
    }
    return res;
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],40:[function(require,module,exports){
arguments[4][35][0].apply(exports,arguments)
},{"dup":35}],41:[function(require,module,exports){
var wrappy = require('wrappy')
module.exports = wrappy(once)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

},{"wrappy":40}],42:[function(require,module,exports){
'use strict';

function posix(path) {
  return path.charAt(0) === '/';
};

function win32(path) {
  // https://github.com/joyent/node/blob/b3fcc245fb25539909ef1d5eaa01dbf92e168633/lib/path.js#L56
  var splitDeviceRe = /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/;
  var result = splitDeviceRe.exec(path);
  var device = result[1] || '';
  var isUnc = !!device && device.charAt(1) !== ':';

  // UNC paths are always absolute
  return !!result[2] || isUnc;
};

module.exports = process.platform === 'win32' ? win32 : posix;
module.exports.posix = posix;
module.exports.win32 = win32;

},{}],43:[function(require,module,exports){
module.exports = globSync
globSync.GlobSync = GlobSync

var fs = require('fs')
var minimatch = require('minimatch')
var Minimatch = minimatch.Minimatch
var Glob = require('./glob.js').Glob
var util = require('util')
var path = require('path')
var assert = require('assert')
var isAbsolute = require('path-is-absolute')
var common = require('./common.js')
var alphasort = common.alphasort
var alphasorti = common.alphasorti
var setopts = common.setopts
var ownProp = common.ownProp
var childrenIgnored = common.childrenIgnored

function globSync (pattern, options) {
  if (typeof options === 'function' || arguments.length === 3)
    throw new TypeError('callback provided to sync glob\n'+
                        'See: https://github.com/isaacs/node-glob/issues/167')

  return new GlobSync(pattern, options).found
}

function GlobSync (pattern, options) {
  if (!pattern)
    throw new Error('must provide pattern')

  if (typeof options === 'function' || arguments.length === 3)
    throw new TypeError('callback provided to sync glob\n'+
                        'See: https://github.com/isaacs/node-glob/issues/167')

  if (!(this instanceof GlobSync))
    return new GlobSync(pattern, options)

  setopts(this, pattern, options)

  if (this.noprocess)
    return this

  var n = this.minimatch.set.length
  this.matches = new Array(n)
  for (var i = 0; i < n; i ++) {
    this._process(this.minimatch.set[i], i, false)
  }
  this._finish()
}

GlobSync.prototype._finish = function () {
  assert(this instanceof GlobSync)
  if (this.realpath) {
    var self = this
    this.matches.forEach(function (matchset, index) {
      var set = self.matches[index] = Object.create(null)
      for (var p in matchset) {
        try {
          p = self._makeAbs(p)
          var real = fs.realpathSync(p, self.realpathCache)
          set[real] = true
        } catch (er) {
          if (er.syscall === 'stat')
            set[self._makeAbs(p)] = true
          else
            throw er
        }
      }
    })
  }
  common.finish(this)
}


GlobSync.prototype._process = function (pattern, index, inGlobStar) {
  assert(this instanceof GlobSync)

  // Get the first [n] parts of pattern that are all strings.
  var n = 0
  while (typeof pattern[n] === 'string') {
    n ++
  }
  // now n is the index of the first one that is *not* a string.

  // See if there's anything else
  var prefix
  switch (n) {
    // if not, then this is rather simple
    case pattern.length:
      this._processSimple(pattern.join('/'), index)
      return

    case 0:
      // pattern *starts* with some non-trivial item.
      // going to readdir(cwd), but not include the prefix in matches.
      prefix = null
      break

    default:
      // pattern has some string bits in the front.
      // whatever it starts with, whether that's 'absolute' like /foo/bar,
      // or 'relative' like '../baz'
      prefix = pattern.slice(0, n).join('/')
      break
  }

  var remain = pattern.slice(n)

  // get the list of entries.
  var read
  if (prefix === null)
    read = '.'
  else if (isAbsolute(prefix) || isAbsolute(pattern.join('/'))) {
    if (!prefix || !isAbsolute(prefix))
      prefix = '/' + prefix
    read = prefix
  } else
    read = prefix

  var abs = this._makeAbs(read)

  //if ignored, skip processing
  if (childrenIgnored(this, read))
    return

  var isGlobStar = remain[0] === minimatch.GLOBSTAR
  if (isGlobStar)
    this._processGlobStar(prefix, read, abs, remain, index, inGlobStar)
  else
    this._processReaddir(prefix, read, abs, remain, index, inGlobStar)
}


GlobSync.prototype._processReaddir = function (prefix, read, abs, remain, index, inGlobStar) {
  var entries = this._readdir(abs, inGlobStar)

  // if the abs isn't a dir, then nothing can match!
  if (!entries)
    return

  // It will only match dot entries if it starts with a dot, or if
  // dot is set.  Stuff like @(.foo|.bar) isn't allowed.
  var pn = remain[0]
  var negate = !!this.minimatch.negate
  var rawGlob = pn._glob
  var dotOk = this.dot || rawGlob.charAt(0) === '.'

  var matchedEntries = []
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    if (e.charAt(0) !== '.' || dotOk) {
      var m
      if (negate && !prefix) {
        m = !e.match(pn)
      } else {
        m = e.match(pn)
      }
      if (m)
        matchedEntries.push(e)
    }
  }

  var len = matchedEntries.length
  // If there are no matched entries, then nothing matches.
  if (len === 0)
    return

  // if this is the last remaining pattern bit, then no need for
  // an additional stat *unless* the user has specified mark or
  // stat explicitly.  We know they exist, since readdir returned
  // them.

  if (remain.length === 1 && !this.mark && !this.stat) {
    if (!this.matches[index])
      this.matches[index] = Object.create(null)

    for (var i = 0; i < len; i ++) {
      var e = matchedEntries[i]
      if (prefix) {
        if (prefix.slice(-1) !== '/')
          e = prefix + '/' + e
        else
          e = prefix + e
      }

      if (e.charAt(0) === '/' && !this.nomount) {
        e = path.join(this.root, e)
      }
      this.matches[index][e] = true
    }
    // This was the last one, and no stats were needed
    return
  }

  // now test all matched entries as stand-ins for that part
  // of the pattern.
  remain.shift()
  for (var i = 0; i < len; i ++) {
    var e = matchedEntries[i]
    var newPattern
    if (prefix)
      newPattern = [prefix, e]
    else
      newPattern = [e]
    this._process(newPattern.concat(remain), index, inGlobStar)
  }
}


GlobSync.prototype._emitMatch = function (index, e) {
  var abs = this._makeAbs(e)
  if (this.mark)
    e = this._mark(e)

  if (this.matches[index][e])
    return

  if (this.nodir) {
    var c = this.cache[this._makeAbs(e)]
    if (c === 'DIR' || Array.isArray(c))
      return
  }

  this.matches[index][e] = true
  if (this.stat)
    this._stat(e)
}


GlobSync.prototype._readdirInGlobStar = function (abs) {
  // follow all symlinked directories forever
  // just proceed as if this is a non-globstar situation
  if (this.follow)
    return this._readdir(abs, false)

  var entries
  var lstat
  var stat
  try {
    lstat = fs.lstatSync(abs)
  } catch (er) {
    // lstat failed, doesn't exist
    return null
  }

  var isSym = lstat.isSymbolicLink()
  this.symlinks[abs] = isSym

  // If it's not a symlink or a dir, then it's definitely a regular file.
  // don't bother doing a readdir in that case.
  if (!isSym && !lstat.isDirectory())
    this.cache[abs] = 'FILE'
  else
    entries = this._readdir(abs, false)

  return entries
}

GlobSync.prototype._readdir = function (abs, inGlobStar) {
  var entries

  if (inGlobStar && !ownProp(this.symlinks, abs))
    return this._readdirInGlobStar(abs)

  if (ownProp(this.cache, abs)) {
    var c = this.cache[abs]
    if (!c || c === 'FILE')
      return null

    if (Array.isArray(c))
      return c
  }

  try {
    return this._readdirEntries(abs, fs.readdirSync(abs))
  } catch (er) {
    this._readdirError(abs, er)
    return null
  }
}

GlobSync.prototype._readdirEntries = function (abs, entries) {
  // if we haven't asked to stat everything, then just
  // assume that everything in there exists, so we can avoid
  // having to stat it a second time.
  if (!this.mark && !this.stat) {
    for (var i = 0; i < entries.length; i ++) {
      var e = entries[i]
      if (abs === '/')
        e = abs + e
      else
        e = abs + '/' + e
      this.cache[e] = true
    }
  }

  this.cache[abs] = entries

  // mark and cache dir-ness
  return entries
}

GlobSync.prototype._readdirError = function (f, er) {
  // handle errors, and cache the information
  switch (er.code) {
    case 'ENOTSUP': // https://github.com/isaacs/node-glob/issues/205
    case 'ENOTDIR': // totally normal. means it *does* exist.
      this.cache[this._makeAbs(f)] = 'FILE'
      if (f === this.cwd) {
        var error = new Error(er.code + ' invalid cwd ' + f)
        error.path = f
        error.code = er.code
        throw error
      }
      break

    case 'ENOENT': // not terribly unusual
    case 'ELOOP':
    case 'ENAMETOOLONG':
    case 'UNKNOWN':
      this.cache[this._makeAbs(f)] = false
      break

    default: // some unusual error.  Treat as failure.
      this.cache[this._makeAbs(f)] = false
      if (this.strict)
        throw er
      if (!this.silent)
        console.error('glob error', er)
      break
  }
}

GlobSync.prototype._processGlobStar = function (prefix, read, abs, remain, index, inGlobStar) {

  var entries = this._readdir(abs, inGlobStar)

  // no entries means not a dir, so it can never have matches
  // foo.txt/** doesn't match foo.txt
  if (!entries)
    return

  // test without the globstar, and with every child both below
  // and replacing the globstar.
  var remainWithoutGlobStar = remain.slice(1)
  var gspref = prefix ? [ prefix ] : []
  var noGlobStar = gspref.concat(remainWithoutGlobStar)

  // the noGlobStar pattern exits the inGlobStar state
  this._process(noGlobStar, index, false)

  var len = entries.length
  var isSym = this.symlinks[abs]

  // If it's a symlink, and we're in a globstar, then stop
  if (isSym && inGlobStar)
    return

  for (var i = 0; i < len; i++) {
    var e = entries[i]
    if (e.charAt(0) === '.' && !this.dot)
      continue

    // these two cases enter the inGlobStar state
    var instead = gspref.concat(entries[i], remainWithoutGlobStar)
    this._process(instead, index, true)

    var below = gspref.concat(entries[i], remain)
    this._process(below, index, true)
  }
}

GlobSync.prototype._processSimple = function (prefix, index) {
  // XXX review this.  Shouldn't it be doing the mounting etc
  // before doing stat?  kinda weird?
  var exists = this._stat(prefix)

  if (!this.matches[index])
    this.matches[index] = Object.create(null)

  // If it doesn't exist, then just mark the lack of results
  if (!exists)
    return

  if (prefix && isAbsolute(prefix) && !this.nomount) {
    var trail = /[\/\\]$/.test(prefix)
    if (prefix.charAt(0) === '/') {
      prefix = path.join(this.root, prefix)
    } else {
      prefix = path.resolve(this.root, prefix)
      if (trail)
        prefix += '/'
    }
  }

  if (process.platform === 'win32')
    prefix = prefix.replace(/\\/g, '/')

  // Mark this as a match
  this.matches[index][prefix] = true
}

// Returns either 'DIR', 'FILE', or false
GlobSync.prototype._stat = function (f) {
  var abs = this._makeAbs(f)
  var needDir = f.slice(-1) === '/'

  if (f.length > this.maxLength)
    return false

  if (!this.stat && ownProp(this.cache, abs)) {
    var c = this.cache[abs]

    if (Array.isArray(c))
      c = 'DIR'

    // It exists, but maybe not how we need it
    if (!needDir || c === 'DIR')
      return c

    if (needDir && c === 'FILE')
      return false

    // otherwise we have to stat, because maybe c=true
    // if we know it exists, but not what it is.
  }

  var exists
  var stat = this.statCache[abs]
  if (!stat) {
    var lstat
    try {
      lstat = fs.lstatSync(abs)
    } catch (er) {
      return false
    }

    if (lstat.isSymbolicLink()) {
      try {
        stat = fs.statSync(abs)
      } catch (er) {
        stat = lstat
      }
    } else {
      stat = lstat
    }
  }

  this.statCache[abs] = stat

  var c = stat.isDirectory() ? 'DIR' : 'FILE'
  this.cache[abs] = this.cache[abs] || c

  if (needDir && c !== 'DIR')
    return false

  return c
}

GlobSync.prototype._mark = function (p) {
  return common.mark(this, p)
}

GlobSync.prototype._makeAbs = function (f) {
  return common.makeAbs(this, f)
}

},{"./common.js":32,"./glob.js":33,"assert":undefined,"fs":undefined,"minimatch":36,"path":undefined,"path-is-absolute":42,"util":undefined}],44:[function(require,module,exports){
module.exports = rimraf
rimraf.sync = rimrafSync

var assert = require("assert")
var path = require("path")
var fs = require("fs")
var glob = require("glob")

var defaultGlobOpts = {
  nosort: true,
  silent: true
}

// for EMFILE handling
var timeout = 0

var isWindows = (process.platform === "win32")

function defaults (options) {
  var methods = [
    'unlink',
    'chmod',
    'stat',
    'lstat',
    'rmdir',
    'readdir'
  ]
  methods.forEach(function(m) {
    options[m] = options[m] || fs[m]
    m = m + 'Sync'
    options[m] = options[m] || fs[m]
  })

  options.maxBusyTries = options.maxBusyTries || 3
  options.emfileWait = options.emfileWait || 1000
  if (options.glob === false) {
    options.disableGlob = true
  }
  options.disableGlob = options.disableGlob || false
  options.glob = options.glob || defaultGlobOpts
}

function rimraf (p, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }

  assert(p, 'rimraf: missing path')
  assert.equal(typeof p, 'string', 'rimraf: path should be a string')
  assert(options, 'rimraf: missing options')
  assert.equal(typeof options, 'object', 'rimraf: options should be object')
  assert.equal(typeof cb, 'function', 'rimraf: callback function required')

  defaults(options)

  var busyTries = 0
  var errState = null
  var n = 0

  if (options.disableGlob || !glob.hasMagic(p))
    return afterGlob(null, [p])

  fs.lstat(p, function (er, stat) {
    if (!er)
      return afterGlob(null, [p])

    glob(p, options.glob, afterGlob)
  })

  function next (er) {
    errState = errState || er
    if (--n === 0)
      cb(errState)
  }

  function afterGlob (er, results) {
    if (er)
      return cb(er)

    n = results.length
    if (n === 0)
      return cb()

    results.forEach(function (p) {
      rimraf_(p, options, function CB (er) {
        if (er) {
          if (isWindows && (er.code === "EBUSY" || er.code === "ENOTEMPTY" || er.code === "EPERM") &&
              busyTries < options.maxBusyTries) {
            busyTries ++
            var time = busyTries * 100
            // try again, with the same exact callback as this one.
            return setTimeout(function () {
              rimraf_(p, options, CB)
            }, time)
          }

          // this one won't happen if graceful-fs is used.
          if (er.code === "EMFILE" && timeout < options.emfileWait) {
            return setTimeout(function () {
              rimraf_(p, options, CB)
            }, timeout ++)
          }

          // already gone
          if (er.code === "ENOENT") er = null
        }

        timeout = 0
        next(er)
      })
    })
  }
}

// Two possible strategies.
// 1. Assume it's a file.  unlink it, then do the dir stuff on EPERM or EISDIR
// 2. Assume it's a directory.  readdir, then do the file stuff on ENOTDIR
//
// Both result in an extra syscall when you guess wrong.  However, there
// are likely far more normal files in the world than directories.  This
// is based on the assumption that a the average number of files per
// directory is >= 1.
//
// If anyone ever complains about this, then I guess the strategy could
// be made configurable somehow.  But until then, YAGNI.
function rimraf_ (p, options, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  // sunos lets the root user unlink directories, which is... weird.
  // so we have to lstat here and make sure it's not a dir.
  options.lstat(p, function (er, st) {
    if (er && er.code === "ENOENT")
      return cb(null)

    if (st && st.isDirectory())
      return rmdir(p, options, er, cb)

    options.unlink(p, function (er) {
      if (er) {
        if (er.code === "ENOENT")
          return cb(null)
        if (er.code === "EPERM")
          return (isWindows)
            ? fixWinEPERM(p, options, er, cb)
            : rmdir(p, options, er, cb)
        if (er.code === "EISDIR")
          return rmdir(p, options, er, cb)
      }
      return cb(er)
    })
  })
}

function fixWinEPERM (p, options, er, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')
  if (er)
    assert(er instanceof Error)

  options.chmod(p, 666, function (er2) {
    if (er2)
      cb(er2.code === "ENOENT" ? null : er)
    else
      options.stat(p, function(er3, stats) {
        if (er3)
          cb(er3.code === "ENOENT" ? null : er)
        else if (stats.isDirectory())
          rmdir(p, options, er, cb)
        else
          options.unlink(p, cb)
      })
  })
}

function fixWinEPERMSync (p, options, er) {
  assert(p)
  assert(options)
  if (er)
    assert(er instanceof Error)

  try {
    options.chmodSync(p, 666)
  } catch (er2) {
    if (er2.code === "ENOENT")
      return
    else
      throw er
  }

  try {
    var stats = options.statSync(p)
  } catch (er3) {
    if (er3.code === "ENOENT")
      return
    else
      throw er
  }

  if (stats.isDirectory())
    rmdirSync(p, options, er)
  else
    options.unlinkSync(p)
}

function rmdir (p, options, originalEr, cb) {
  assert(p)
  assert(options)
  if (originalEr)
    assert(originalEr instanceof Error)
  assert(typeof cb === 'function')

  // try to rmdir first, and only readdir on ENOTEMPTY or EEXIST (SunOS)
  // if we guessed wrong, and it's not a directory, then
  // raise the original error.
  options.rmdir(p, function (er) {
    if (er && (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM"))
      rmkids(p, options, cb)
    else if (er && er.code === "ENOTDIR")
      cb(originalEr)
    else
      cb(er)
  })
}

function rmkids(p, options, cb) {
  assert(p)
  assert(options)
  assert(typeof cb === 'function')

  options.readdir(p, function (er, files) {
    if (er)
      return cb(er)
    var n = files.length
    if (n === 0)
      return options.rmdir(p, cb)
    var errState
    files.forEach(function (f) {
      rimraf(path.join(p, f), options, function (er) {
        if (errState)
          return
        if (er)
          return cb(errState = er)
        if (--n === 0)
          options.rmdir(p, cb)
      })
    })
  })
}

// this looks simpler, and is strictly *faster*, but will
// tie up the JavaScript thread and fail on excessively
// deep directory trees.
function rimrafSync (p, options) {
  options = options || {}
  defaults(options)

  assert(p, 'rimraf: missing path')
  assert.equal(typeof p, 'string', 'rimraf: path should be a string')
  assert(options, 'rimraf: missing options')
  assert.equal(typeof options, 'object', 'rimraf: options should be object')

  var results

  if (options.disableGlob || !glob.hasMagic(p)) {
    results = [p]
  } else {
    try {
      fs.lstatSync(p)
      results = [p]
    } catch (er) {
      results = glob.sync(p, options.glob)
    }
  }

  if (!results.length)
    return

  for (var i = 0; i < results.length; i++) {
    var p = results[i]

    try {
      var st = options.lstatSync(p)
    } catch (er) {
      if (er.code === "ENOENT")
        return
    }

    try {
      // sunos lets the root user unlink directories, which is... weird.
      if (st && st.isDirectory())
        rmdirSync(p, options, null)
      else
        options.unlinkSync(p)
    } catch (er) {
      if (er.code === "ENOENT")
        return
      if (er.code === "EPERM")
        return isWindows ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er)
      if (er.code !== "EISDIR")
        throw er
      rmdirSync(p, options, er)
    }
  }
}

function rmdirSync (p, options, originalEr) {
  assert(p)
  assert(options)
  if (originalEr)
    assert(originalEr instanceof Error)

  try {
    options.rmdirSync(p)
  } catch (er) {
    if (er.code === "ENOENT")
      return
    if (er.code === "ENOTDIR")
      throw originalEr
    if (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM")
      rmkidsSync(p, options)
  }
}

function rmkidsSync (p, options) {
  assert(p)
  assert(options)
  options.readdirSync(p).forEach(function (f) {
    rimrafSync(path.join(p, f), options)
  })
  options.rmdirSync(p, options)
}

},{"assert":undefined,"fs":undefined,"glob":33,"path":undefined}],45:[function(require,module,exports){
module.exports = require('util').inherits

},{"util":undefined}],46:[function(require,module,exports){
// field paths that every tar file must have.
// header is padded to 512 bytes.
var f = 0
  , fields = {}
  , path = fields.path = f++
  , mode = fields.mode = f++
  , uid = fields.uid = f++
  , gid = fields.gid = f++
  , size = fields.size = f++
  , mtime = fields.mtime = f++
  , cksum = fields.cksum = f++
  , type = fields.type = f++
  , linkpath = fields.linkpath = f++
  , headerSize = 512
  , blockSize = 512
  , fieldSize = []

fieldSize[path] = 100
fieldSize[mode] = 8
fieldSize[uid] = 8
fieldSize[gid] = 8
fieldSize[size] = 12
fieldSize[mtime] = 12
fieldSize[cksum] = 8
fieldSize[type] = 1
fieldSize[linkpath] = 100

// "ustar\0" may introduce another bunch of headers.
// these are optional, and will be nulled out if not present.

var ustar = fields.ustar = f++
  , ustarver = fields.ustarver = f++
  , uname = fields.uname = f++
  , gname = fields.gname = f++
  , devmaj = fields.devmaj = f++
  , devmin = fields.devmin = f++
  , prefix = fields.prefix = f++
  , fill = fields.fill = f++

// terminate fields.
fields[f] = null

fieldSize[ustar] = 6
fieldSize[ustarver] = 2
fieldSize[uname] = 32
fieldSize[gname] = 32
fieldSize[devmaj] = 8
fieldSize[devmin] = 8
fieldSize[prefix] = 155
fieldSize[fill] = 12

// nb: prefix field may in fact be 130 bytes of prefix,
// a null char, 12 bytes for atime, 12 bytes for ctime.
//
// To recognize this format:
// 1. prefix[130] === ' ' or '\0'
// 2. atime and ctime are octal numeric values
// 3. atime and ctime have ' ' in their last byte

var fieldEnds = {}
  , fieldOffs = {}
  , fe = 0
for (var i = 0; i < f; i ++) {
  fieldOffs[i] = fe
  fieldEnds[i] = (fe += fieldSize[i])
}

// build a translation table of field paths.
Object.keys(fields).forEach(function (f) {
  if (fields[f] !== null) fields[fields[f]] = f
})

// different values of the 'type' field
// paths match the values of Stats.isX() functions, where appropriate
var types =
  { 0: "File"
  , "\0": "OldFile" // like 0
  , "": "OldFile"
  , 1: "Link"
  , 2: "SymbolicLink"
  , 3: "CharacterDevice"
  , 4: "BlockDevice"
  , 5: "Directory"
  , 6: "FIFO"
  , 7: "ContiguousFile" // like 0
  // posix headers
  , g: "GlobalExtendedHeader" // k=v for the rest of the archive
  , x: "ExtendedHeader" // k=v for the next file
  // vendor-specific stuff
  , A: "SolarisACL" // skip
  , D: "GNUDumpDir" // like 5, but with data, which should be skipped
  , I: "Inode" // metadata only, skip
  , K: "NextFileHasLongLinkpath" // data = link path of next file
  , L: "NextFileHasLongPath" // data = path of next file
  , M: "ContinuationFile" // skip
  , N: "OldGnuLongPath" // like L
  , S: "SparseFile" // skip
  , V: "TapeVolumeHeader" // skip
  , X: "OldExtendedHeader" // like x
  }

Object.keys(types).forEach(function (t) {
  types[types[t]] = types[types[t]] || t
})

// values for the mode field
var modes =
  { suid: 04000 // set uid on extraction
  , sgid: 02000 // set gid on extraction
  , svtx: 01000 // set restricted deletion flag on dirs on extraction
  , uread:  0400
  , uwrite: 0200
  , uexec:  0100
  , gread:  040
  , gwrite: 020
  , gexec:  010
  , oread:  4
  , owrite: 2
  , oexec:  1
  , all: 07777
  }

var numeric =
  { mode: true
  , uid: true
  , gid: true
  , size: true
  , mtime: true
  , devmaj: true
  , devmin: true
  , cksum: true
  , atime: true
  , ctime: true
  , dev: true
  , ino: true
  , nlink: true
  }

Object.keys(modes).forEach(function (t) {
  modes[modes[t]] = modes[modes[t]] || t
})

var knownExtended =
  { atime: true
  , charset: true
  , comment: true
  , ctime: true
  , gid: true
  , gname: true
  , linkpath: true
  , mtime: true
  , path: true
  , realtime: true
  , security: true
  , size: true
  , uid: true
  , uname: true }


exports.fields = fields
exports.fieldSize = fieldSize
exports.fieldOffs = fieldOffs
exports.fieldEnds = fieldEnds
exports.types = types
exports.modes = modes
exports.numeric = numeric
exports.headerSize = headerSize
exports.blockSize = blockSize
exports.knownExtended = knownExtended

exports.Pack = require("./lib/pack.js")
exports.Parse = require("./lib/parse.js")
exports.Extract = require("./lib/extract.js")

},{"./lib/extract.js":6,"./lib/pack.js":9,"./lib/parse.js":10}]},{},[46])(46)
// end the bundled `tar` module





























,

/*ziplocal*/(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var fs = require('fs');
var path = require('path');
var async = require('async');
var ZippedFS = require('./ZippedFS.js');

/*****************************************************************************************
******************************** PRIVATE HELPER FUNCTIONS ********************************
*****************************************************************************************/

/*
 * extracts an unzipped file to the disk asynchrnously
 * @param _path {String}: extraction path
 * @param jszip {JSZip}: the jszip object containg the unzipped file
 * @param callback {Function}: the function to be called when extracting is done
 */
function extract_to(_path, jszip, callback) {

    var extraction_path = _path === null ? "./" : path.normalize(_path);
    var current_working_dirctory = process.cwd();

    // make sure that the extraction path points to a existing directory
    fs.stat(extraction_path, function (err, stats) {

        if (err)
            throw new Error(extraction_path + " doesn't exist");

        if (!stats.isDirectory())
            throw new Error(extraction_path + " is not a directory");

        // sort out the unzipped file to directories and files
        var dirs = [];
        var files = [];
        for (var name in jszip.files) {
            
            var entry = jszip.files[name];
            
            if (entry.dir)
                dirs.push(name);
            else
                files.push(name);
        }
        
        // sort the directories ascendingy by level
        dirs.sort(function (a, b) {
            function dir_sep_count(dir) { return (dir.match(/\//g) || []).length; }
            
            return dir_sep_count(a) - dir_sep_count(b);
        });

        // change process's working directory to extraction directory
        process.chdir(extraction_path);

        // create the directories
        async.eachSeries(dirs, function (dir, end_iteration) {

            fs.mkdir(dir, function () {
                // end of this iteration
                end_iteration();
            });

        }, function (err) {
            
            if (err)
                throw err;

            // write the files
            async.each(files, function (file, end_iteration) { 

                var data = jszip.file(file).asNodeBuffer();

                fs.writeFile(file, data, function (err) {
                    
                    if (err)
                        throw err;
                    
                    // end of this iteration
                    end_iteration();

                });
            }, function (err) { 
                
                // change the process working directory back
                process.chdir(current_working_dirctory);

                // invoke the callback
                callback();
            });
        });
    });
}

/*
 * extracts an unzipped file to the disk synchrnously
 * @param _path {String}: extraction path
 * @param jszip {JSZip}: the jszip object containg the unzipped file
 */
function extract_to_sync(_path, jszip) {
    
    var extraction_path = _path === null ? "./" : path.normalize(_path);
    var current_working_dirctory = process.cwd();
    
    // make sure that the extraction path points to a existing directory
    var stats;
    try { stats = fs.statSync(extraction_path); }
    catch (err) { throw new Error(extraction_path + " doesn't exist"); }
    if (!stats.isDirectory())
        throw new Error(extraction_path + " is not a directory");
    
    // sort out the unzipped file to directories and files
    var dirs = [];
    var files = [];
    for (var name in jszip.files) {

        var entry = jszip.files[name];

        if (entry.dir)
            dirs.push(name);
        else
            files.push(name);
    }
    
    // sort the directories ascendingy by level
    dirs.sort(function (a, b) {
        function dir_sep_count(dir) { return (dir.match(/\//g) || []).length; }
        
        return dir_sep_count(a) - dir_sep_count(b);
    });

    // change process's working directory to extraction directory
    process.chdir(extraction_path);

    // create the directories
    dirs.forEach(function (dir) {
        fs.mkdirSync(dir);
    });

    // write the files
    files.forEach(function (file) {

        var data = jszip.file(file).asNodeBuffer();

        fs.writeFileSync(file, data);
    });

    // change the process working directory back
    process.chdir(current_working_dirctory);
}


/*****************************************************************************************
********************************** MODULE PUBLIC APIS ************************************ 
***** THE MODULE CONTAINS THE APIS THAT DEAL WITH EXPORTING AFTER ZIPPING IS COMPLETE ****
*****************************************************************************************/

/*
 * constructs a ZipExport object out of a JSZip object
 * @param jszip {JSZip}: the JSZip object
 * @param unzipped {Boolean}: a flag to indicate if the source jszip was from an unzipped file
 * @param async {Boolean}: a flag to indicate whether the zipping was asynchrnously
 */
function ZipExport(jszip, unzipped, async) {
    
    // hold the JSZip for exporting
    this.content = jszip;
    
    // determines if the exported will be compressed
    this.compressed = false;
    
    // determines if the source is an unzipped file 
    this.src_unzipped = unzipped ? true : false;
    
    // determines if the exported file will be written asynchronously
    this.save_async = async ? true : false;
}

/*
 * returns the associated JSZip object for low level operations
 * @returns {JSZip}: the associated JSZip object
 */
ZipExport.prototype.lowLevel = function () {

    return this.content;
} 

/*
 * sets the object so that the exported format will be compressed
 */
ZipExport.prototype.compress = function () {

    if(!this.src_unzipped)
        this.compressed = true;
    
    return this;
}

/*
 * returns the zipped/unzipped file representation in memory
 * @return {Buffer|ZippedFS}: Buffer for a zipped file, a ZippedFS object for unzipped
 */
ZipExport.prototype.memory = function() {
    
    if (!this.src_unzipped) {

        // generate the zipped buffer
        var buff = this.content.generate({
            type: "nodebuffer",
            compression: this.compressed ? "DEFLATE" : undefined
        });
        
        return new Buffer(buff);
    }
    else {

        // return a ZippedFS object of the unzipped file
        return new ZippedFS(this.content);
    }
}

/*
 * writes the zipped/unzipped file to disk
 * @param _path {String}: path to the output file
 * @param _callback {Function}: the function to be called when the save is done (only in async zipping)
 */
ZipExport.prototype.save = function (_path, _callback) {
    
    var callback = _callback || function () { };
    
    if (!this.src_unzipped) {
        // generate the zipped buffer
        var buff = this.content.generate({
            type: "nodebuffer",
            compression: this.compressed ? "DEFLATE" : undefined
        });
        
        var normalized_path = path.normalize(_path);
        var parsed_path = path.parse(normalized_path);
        var current_working_directory = process.cwd();
        
        
        // change process's directory to save directory if exists
        if (parsed_path.dir !== '')
            process.chdir(parsed_path.dir);
        
        // write the new file
        if (!this.save_async) {

            fs.writeFileSync(parsed_path.base, buff);

            // change process's directory back
            process.chdir(current_working_directory);
        }
        else
            fs.writeFile(parsed_path.base, buff, function (err) {
                
                if (err)
                    throw err;
                
                // change process's directory back
                process.chdir(current_working_directory);
                
                //invoke the callback
                callback();

            });
    }
    else {
        
        // extract the unzipped file to given directory
        if (!this.save_async)
            extract_to_sync(_path ? _path : null, this.content);
        else
            extract_to(_path ? _path : null, this.content, callback);
    }
}


module.exports = ZipExport;
},{"./ZippedFS.js":2,"async":3,"fs":undefined,"path":undefined}],2:[function(require,module,exports){
/*****************************************************************************************
***** THE MODULE CONTAINS THE APIS THAT DEAL WITH READING FILES FROM AN UNZIPPED FILE ****
*****************************************************************************************/

/*
 * constructs a ZippedFS object out of a unzipped JSZip object
 * @param jszip {JSZip}: the JSZip object
 */
function ZippedFS(jszip) {

    // holds the content of the unzipped file
    this.unzipped_file = jszip;
    
    // holds a list of the files in the unzipped file
    this.files_list = [];

    // populate the files list
    for (var name in this.unzipped_file.files) {
        
        var entry = this.unzipped_file.files[name];
        if (!entry.dir)
            this.files_list.push(name);
    }
}

/*
 * returns the list of the files in the unzipped file
 * @return {Array}: a list of file paths in the unzipped file
 */
ZippedFS.prototype.contents = function () {
    return this.files_list;
}

/*
 * reads a file in the unzipped file by its path
 * @param _path {String}: the path of the file inside the unzipped file
 * @param type {String}: the return type of the file, either buffer or text
 * @return {Buffer|String}: a buffer that contains the file or the file as text
 */
ZippedFS.prototype.read = function (_path, type) {

    if (this.files_list.indexOf(_path) !== -1) {
        
        if (type === 'buffer')
            return this.unzipped_file.file(_path).asNodeBuffer();
        else if (type === 'text')
            return this.unzipped_file.file(_path).asText();
        else
            throw new Error("Unrecognized type");
    }
    else
        throw new Error(_path + " doesn't exist within the unzipped file");
}


module.exports = ZippedFS; 

 
},{}],3:[function(require,module,exports){
/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
(function () {

    var async = {};
    function noop() {}
    function identity(v) {
        return v;
    }
    function toBool(v) {
        return !!v;
    }
    function notId(v) {
        return !v;
    }

    // global on the server, window in the browser
    var previous_async;

    // Establish the root object, `window` (`self`) in the browser, `global`
    // on the server, or `this` in some virtual machines. We use `self`
    // instead of `window` for `WebWorker` support.
    var root = typeof self === 'object' && self.self === self && self ||
            typeof global === 'object' && global.global === global && global ||
            this;

    if (root != null) {
        previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        return function() {
            if (fn === null) throw new Error("Callback was already called.");
            fn.apply(this, arguments);
            fn = null;
        };
    }

    function _once(fn) {
        return function() {
            if (fn === null) return;
            fn.apply(this, arguments);
            fn = null;
        };
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    // Ported from underscore.js isObject
    var _isObject = function(obj) {
        var type = typeof obj;
        return type === 'function' || type === 'object' && !!obj;
    };

    function _isArrayLike(arr) {
        return _isArray(arr) || (
            // has a positive integer length property
            typeof arr.length === "number" &&
            arr.length >= 0 &&
            arr.length % 1 === 0
        );
    }

    function _arrayEach(arr, iterator) {
        var index = -1,
            length = arr.length;

        while (++index < length) {
            iterator(arr[index], index, arr);
        }
    }

    function _map(arr, iterator) {
        var index = -1,
            length = arr.length,
            result = Array(length);

        while (++index < length) {
            result[index] = iterator(arr[index], index, arr);
        }
        return result;
    }

    function _range(count) {
        return _map(Array(count), function (v, i) { return i; });
    }

    function _reduce(arr, iterator, memo) {
        _arrayEach(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    }

    function _forEachOf(object, iterator) {
        _arrayEach(_keys(object), function (key) {
            iterator(object[key], key);
        });
    }

    function _indexOf(arr, item) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === item) return i;
        }
        return -1;
    }

    var _keys = Object.keys || function (obj) {
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    function _keyIterator(coll) {
        var i = -1;
        var len;
        var keys;
        if (_isArrayLike(coll)) {
            len = coll.length;
            return function next() {
                i++;
                return i < len ? i : null;
            };
        } else {
            keys = _keys(coll);
            len = keys.length;
            return function next() {
                i++;
                return i < len ? keys[i] : null;
            };
        }
    }

    // Similar to ES6's rest param (http://ariya.ofilabs.com/2013/03/es6-and-rest-parameter.html)
    // This accumulates the arguments passed into an array, after a given index.
    // From underscore.js (https://github.com/jashkenas/underscore/pull/2140).
    function _restParam(func, startIndex) {
        startIndex = startIndex == null ? func.length - 1 : +startIndex;
        return function() {
            var length = Math.max(arguments.length - startIndex, 0);
            var rest = Array(length);
            for (var index = 0; index < length; index++) {
                rest[index] = arguments[index + startIndex];
            }
            switch (startIndex) {
                case 0: return func.call(this, rest);
                case 1: return func.call(this, arguments[0], rest);
            }
            // Currently unused but handle cases outside of the switch statement:
            // var args = Array(startIndex + 1);
            // for (index = 0; index < startIndex; index++) {
            //     args[index] = arguments[index];
            // }
            // args[startIndex] = rest;
            // return func.apply(this, args);
        };
    }

    function _withoutIndex(iterator) {
        return function (value, index, callback) {
            return iterator(value, callback);
        };
    }

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////

    // capture the global reference to guard against fakeTimer mocks
    var _setImmediate = typeof setImmediate === 'function' && setImmediate;

    var _delay = _setImmediate ? function(fn) {
        // not a direct alias for IE10 compatibility
        _setImmediate(fn);
    } : function(fn) {
        setTimeout(fn, 0);
    };

    if (typeof process === 'object' && typeof process.nextTick === 'function') {
        async.nextTick = process.nextTick;
    } else {
        async.nextTick = _delay;
    }
    async.setImmediate = _setImmediate ? _delay : async.nextTick;


    async.forEach =
    async.each = function (arr, iterator, callback) {
        return async.eachOf(arr, _withoutIndex(iterator), callback);
    };

    async.forEachSeries =
    async.eachSeries = function (arr, iterator, callback) {
        return async.eachOfSeries(arr, _withoutIndex(iterator), callback);
    };


    async.forEachLimit =
    async.eachLimit = function (arr, limit, iterator, callback) {
        return _eachOfLimit(limit)(arr, _withoutIndex(iterator), callback);
    };

    async.forEachOf =
    async.eachOf = function (object, iterator, callback) {
        callback = _once(callback || noop);
        object = object || [];

        var iter = _keyIterator(object);
        var key, completed = 0;

        while ((key = iter()) != null) {
            completed += 1;
            iterator(object[key], key, only_once(done));
        }

        if (completed === 0) callback(null);

        function done(err) {
            completed--;
            if (err) {
                callback(err);
            }
            // Check key is null in case iterator isn't exhausted
            // and done resolved synchronously.
            else if (key === null && completed <= 0) {
                callback(null);
            }
        }
    };

    async.forEachOfSeries =
    async.eachOfSeries = function (obj, iterator, callback) {
        callback = _once(callback || noop);
        obj = obj || [];
        var nextKey = _keyIterator(obj);
        var key = nextKey();
        function iterate() {
            var sync = true;
            if (key === null) {
                return callback(null);
            }
            iterator(obj[key], key, only_once(function (err) {
                if (err) {
                    callback(err);
                }
                else {
                    key = nextKey();
                    if (key === null) {
                        return callback(null);
                    } else {
                        if (sync) {
                            async.setImmediate(iterate);
                        } else {
                            iterate();
                        }
                    }
                }
            }));
            sync = false;
        }
        iterate();
    };



    async.forEachOfLimit =
    async.eachOfLimit = function (obj, limit, iterator, callback) {
        _eachOfLimit(limit)(obj, iterator, callback);
    };

    function _eachOfLimit(limit) {

        return function (obj, iterator, callback) {
            callback = _once(callback || noop);
            obj = obj || [];
            var nextKey = _keyIterator(obj);
            if (limit <= 0) {
                return callback(null);
            }
            var done = false;
            var running = 0;
            var errored = false;

            (function replenish () {
                if (done && running <= 0) {
                    return callback(null);
                }

                while (running < limit && !errored) {
                    var key = nextKey();
                    if (key === null) {
                        done = true;
                        if (running <= 0) {
                            callback(null);
                        }
                        return;
                    }
                    running += 1;
                    iterator(obj[key], key, only_once(function (err) {
                        running -= 1;
                        if (err) {
                            callback(err);
                            errored = true;
                        }
                        else {
                            replenish();
                        }
                    }));
                }
            })();
        };
    }


    function doParallel(fn) {
        return function (obj, iterator, callback) {
            return fn(async.eachOf, obj, iterator, callback);
        };
    }
    function doParallelLimit(fn) {
        return function (obj, limit, iterator, callback) {
            return fn(_eachOfLimit(limit), obj, iterator, callback);
        };
    }
    function doSeries(fn) {
        return function (obj, iterator, callback) {
            return fn(async.eachOfSeries, obj, iterator, callback);
        };
    }

    function _asyncMap(eachfn, arr, iterator, callback) {
        callback = _once(callback || noop);
        arr = arr || [];
        var results = _isArrayLike(arr) ? [] : {};
        eachfn(arr, function (value, index, callback) {
            iterator(value, function (err, v) {
                results[index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    }

    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = doParallelLimit(_asyncMap);

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.inject =
    async.foldl =
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachOfSeries(arr, function (x, i, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };

    async.foldr =
    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, identity).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };

    async.transform = function (arr, memo, iterator, callback) {
        if (arguments.length === 3) {
            callback = iterator;
            iterator = memo;
            memo = _isArray(arr) ? [] : {};
        }

        async.eachOf(arr, function(v, k, cb) {
            iterator(memo, v, k, cb);
        }, function(err) {
            callback(err, memo);
        });
    };

    function _filter(eachfn, arr, iterator, callback) {
        var results = [];
        eachfn(arr, function (x, index, callback) {
            iterator(x, function (v) {
                if (v) {
                    results.push({index: index, value: x});
                }
                callback();
            });
        }, function () {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    }

    async.select =
    async.filter = doParallel(_filter);

    async.selectLimit =
    async.filterLimit = doParallelLimit(_filter);

    async.selectSeries =
    async.filterSeries = doSeries(_filter);

    function _reject(eachfn, arr, iterator, callback) {
        _filter(eachfn, arr, function(value, cb) {
            iterator(value, function(v) {
                cb(!v);
            });
        }, callback);
    }
    async.reject = doParallel(_reject);
    async.rejectLimit = doParallelLimit(_reject);
    async.rejectSeries = doSeries(_reject);

    function _createTester(eachfn, check, getResult) {
        return function(arr, limit, iterator, cb) {
            function done() {
                if (cb) cb(getResult(false, void 0));
            }
            function iteratee(x, _, callback) {
                if (!cb) return callback();
                iterator(x, function (v) {
                    if (cb && check(v)) {
                        cb(getResult(true, x));
                        cb = iterator = false;
                    }
                    callback();
                });
            }
            if (arguments.length > 3) {
                eachfn(arr, limit, iteratee, done);
            } else {
                cb = iterator;
                iterator = limit;
                eachfn(arr, iteratee, done);
            }
        };
    }

    async.any =
    async.some = _createTester(async.eachOf, toBool, identity);

    async.someLimit = _createTester(async.eachOfLimit, toBool, identity);

    async.all =
    async.every = _createTester(async.eachOf, notId, notId);

    async.everyLimit = _createTester(async.eachOfLimit, notId, notId);

    function _findGetResult(v, x) {
        return x;
    }
    async.detect = _createTester(async.eachOf, identity, _findGetResult);
    async.detectSeries = _createTester(async.eachOfSeries, identity, _findGetResult);
    async.detectLimit = _createTester(async.eachOfLimit, identity, _findGetResult);

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                callback(null, _map(results.sort(comparator), function (x) {
                    return x.value;
                }));
            }

        });

        function comparator(left, right) {
            var a = left.criteria, b = right.criteria;
            return a < b ? -1 : a > b ? 1 : 0;
        }
    };

    async.auto = function (tasks, concurrency, callback) {
        if (typeof arguments[1] === 'function') {
            // concurrency is optional, shift the args.
            callback = concurrency;
            concurrency = null;
        }
        callback = _once(callback || noop);
        var keys = _keys(tasks);
        var remainingTasks = keys.length;
        if (!remainingTasks) {
            return callback(null);
        }
        if (!concurrency) {
            concurrency = remainingTasks;
        }

        var results = {};
        var runningTasks = 0;

        var hasError = false;

        var listeners = [];
        function addListener(fn) {
            listeners.unshift(fn);
        }
        function removeListener(fn) {
            var idx = _indexOf(listeners, fn);
            if (idx >= 0) listeners.splice(idx, 1);
        }
        function taskComplete() {
            remainingTasks--;
            _arrayEach(listeners.slice(0), function (fn) {
                fn();
            });
        }

        addListener(function () {
            if (!remainingTasks) {
                callback(null, results);
            }
        });

        _arrayEach(keys, function (k) {
            if (hasError) return;
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = _restParam(function(err, args) {
                runningTasks--;
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _forEachOf(results, function(val, rkey) {
                        safeResults[rkey] = val;
                    });
                    safeResults[k] = args;
                    hasError = true;

                    callback(err, safeResults);
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            });
            var requires = task.slice(0, task.length - 1);
            // prevent dead-locks
            var len = requires.length;
            var dep;
            while (len--) {
                if (!(dep = tasks[requires[len]])) {
                    throw new Error('Has nonexistent dependency in ' + requires.join(', '));
                }
                if (_isArray(dep) && _indexOf(dep, k) >= 0) {
                    throw new Error('Has cyclic dependencies');
                }
            }
            function ready() {
                return runningTasks < concurrency && _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            }
            if (ready()) {
                runningTasks++;
                task[task.length - 1](taskCallback, results);
            }
            else {
                addListener(listener);
            }
            function listener() {
                if (ready()) {
                    runningTasks++;
                    removeListener(listener);
                    task[task.length - 1](taskCallback, results);
                }
            }
        });
    };



    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var DEFAULT_INTERVAL = 0;

        var attempts = [];

        var opts = {
            times: DEFAULT_TIMES,
            interval: DEFAULT_INTERVAL
        };

        function parseTimes(acc, t){
            if(typeof t === 'number'){
                acc.times = parseInt(t, 10) || DEFAULT_TIMES;
            } else if(typeof t === 'object'){
                acc.times = parseInt(t.times, 10) || DEFAULT_TIMES;
                acc.interval = parseInt(t.interval, 10) || DEFAULT_INTERVAL;
            } else {
                throw new Error('Unsupported argument type for \'times\': ' + typeof t);
            }
        }

        var length = arguments.length;
        if (length < 1 || length > 3) {
            throw new Error('Invalid arguments - must be either (task), (task, callback), (times, task) or (times, task, callback)');
        } else if (length <= 2 && typeof times === 'function') {
            callback = task;
            task = times;
        }
        if (typeof times !== 'function') {
            parseTimes(opts, times);
        }
        opts.callback = callback;
        opts.task = task;

        function wrappedTask(wrappedCallback, wrappedResults) {
            function retryAttempt(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            }

            function retryInterval(interval){
                return function(seriesCallback){
                    setTimeout(function(){
                        seriesCallback(null);
                    }, interval);
                };
            }

            while (opts.times) {

                var finalAttempt = !(opts.times-=1);
                attempts.push(retryAttempt(opts.task, finalAttempt));
                if(!finalAttempt && opts.interval > 0){
                    attempts.push(retryInterval(opts.interval));
                }
            }

            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || opts.callback)(data.err, data.result);
            });
        }

        // If a callback is passed, run this as a controll flow
        return opts.callback ? wrappedTask() : wrappedTask;
    };

    async.waterfall = function (tasks, callback) {
        callback = _once(callback || noop);
        if (!_isArray(tasks)) {
            var err = new Error('First argument to waterfall must be an array of functions');
            return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        function wrapIterator(iterator) {
            return _restParam(function (err, args) {
                if (err) {
                    callback.apply(null, [err].concat(args));
                }
                else {
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    ensureAsync(iterator).apply(null, args);
                }
            });
        }
        wrapIterator(async.iterator(tasks))();
    };

    function _parallel(eachfn, tasks, callback) {
        callback = callback || noop;
        var results = _isArrayLike(tasks) ? [] : {};

        eachfn(tasks, function (task, key, callback) {
            task(_restParam(function (err, args) {
                if (args.length <= 1) {
                    args = args[0];
                }
                results[key] = args;
                callback(err);
            }));
        }, function (err) {
            callback(err, results);
        });
    }

    async.parallel = function (tasks, callback) {
        _parallel(async.eachOf, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel(_eachOfLimit(limit), tasks, callback);
    };

    async.series = function(tasks, callback) {
        _parallel(async.eachOfSeries, tasks, callback);
    };

    async.iterator = function (tasks) {
        function makeCallback(index) {
            function fn() {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            }
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        }
        return makeCallback(0);
    };

    async.apply = _restParam(function (fn, args) {
        return _restParam(function (callArgs) {
            return fn.apply(
                null, args.concat(callArgs)
            );
        });
    });

    function _concat(eachfn, arr, fn, callback) {
        var result = [];
        eachfn(arr, function (x, index, cb) {
            fn(x, function (err, y) {
                result = result.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, result);
        });
    }
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        callback = callback || noop;
        if (test()) {
            var next = _restParam(function(err, args) {
                if (err) {
                    callback(err);
                } else if (test.apply(this, args)) {
                    iterator(next);
                } else {
                    callback.apply(null, [null].concat(args));
                }
            });
            iterator(next);
        } else {
            callback(null);
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        var calls = 0;
        return async.whilst(function() {
            return ++calls <= 1 || test.apply(this, arguments);
        }, iterator, callback);
    };

    async.until = function (test, iterator, callback) {
        return async.whilst(function() {
            return !test.apply(this, arguments);
        }, iterator, callback);
    };

    async.doUntil = function (iterator, test, callback) {
        return async.doWhilst(iterator, function() {
            return !test.apply(this, arguments);
        }, callback);
    };

    async.during = function (test, iterator, callback) {
        callback = callback || noop;

        var next = _restParam(function(err, args) {
            if (err) {
                callback(err);
            } else {
                args.push(check);
                test.apply(this, args);
            }
        });

        var check = function(err, truth) {
            if (err) {
                callback(err);
            } else if (truth) {
                iterator(next);
            } else {
                callback(null);
            }
        };

        test(check);
    };

    async.doDuring = function (iterator, test, callback) {
        var calls = 0;
        async.during(function(next) {
            if (calls++ < 1) {
                next(null, true);
            } else {
                test.apply(this, arguments);
            }
        }, iterator, callback);
    };

    function _queue(worker, concurrency, payload) {
        if (concurrency == null) {
            concurrency = 1;
        }
        else if(concurrency === 0) {
            throw new Error('Concurrency must not be zero');
        }
        function _insert(q, data, pos, callback) {
            if (callback != null && typeof callback !== "function") {
                throw new Error("task callback must be a function");
            }
            q.started = true;
            if (!_isArray(data)) {
                data = [data];
            }
            if(data.length === 0 && q.idle()) {
                // call drain immediately if there are no tasks
                return async.setImmediate(function() {
                    q.drain();
                });
            }
            _arrayEach(data, function(task) {
                var item = {
                    data: task,
                    callback: callback || noop
                };

                if (pos) {
                    q.tasks.unshift(item);
                } else {
                    q.tasks.push(item);
                }

                if (q.tasks.length === q.concurrency) {
                    q.saturated();
                }
            });
            async.setImmediate(q.process);
        }
        function _next(q, tasks) {
            return function(){
                workers -= 1;

                var removed = false;
                var args = arguments;
                _arrayEach(tasks, function (task) {
                    _arrayEach(workersList, function (worker, index) {
                        if (worker === task && !removed) {
                            workersList.splice(index, 1);
                            removed = true;
                        }
                    });

                    task.callback.apply(task, args);
                });
                if (q.tasks.length + workers === 0) {
                    q.drain();
                }
                q.process();
            };
        }

        var workers = 0;
        var workersList = [];
        var q = {
            tasks: [],
            concurrency: concurrency,
            payload: payload,
            saturated: noop,
            empty: noop,
            drain: noop,
            started: false,
            paused: false,
            push: function (data, callback) {
                _insert(q, data, false, callback);
            },
            kill: function () {
                q.drain = noop;
                q.tasks = [];
            },
            unshift: function (data, callback) {
                _insert(q, data, true, callback);
            },
            process: function () {
                while(!q.paused && workers < q.concurrency && q.tasks.length){

                    var tasks = q.payload ?
                        q.tasks.splice(0, q.payload) :
                        q.tasks.splice(0, q.tasks.length);

                    var data = _map(tasks, function (task) {
                        return task.data;
                    });

                    if (q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    workersList.push(tasks[0]);
                    var cb = only_once(_next(q, tasks));
                    worker(data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            workersList: function () {
                return workersList;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                q.paused = true;
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                var resumeCount = Math.min(q.concurrency, q.tasks.length);
                // Need to call q.process once per concurrent
                // worker to preserve full concurrency after pause
                for (var w = 1; w <= resumeCount; w++) {
                    async.setImmediate(q.process);
                }
            }
        };
        return q;
    }

    async.queue = function (worker, concurrency) {
        var q = _queue(function (items, cb) {
            worker(items[0], cb);
        }, concurrency, 1);

        return q;
    };

    async.priorityQueue = function (worker, concurrency) {

        function _compareTasks(a, b){
            return a.priority - b.priority;
        }

        function _binarySearch(sequence, item, compare) {
            var beg = -1,
                end = sequence.length - 1;
            while (beg < end) {
                var mid = beg + ((end - beg + 1) >>> 1);
                if (compare(item, sequence[mid]) >= 0) {
                    beg = mid;
                } else {
                    end = mid - 1;
                }
            }
            return beg;
        }

        function _insert(q, data, priority, callback) {
            if (callback != null && typeof callback !== "function") {
                throw new Error("task callback must be a function");
            }
            q.started = true;
            if (!_isArray(data)) {
                data = [data];
            }
            if(data.length === 0) {
                // call drain immediately if there are no tasks
                return async.setImmediate(function() {
                    q.drain();
                });
            }
            _arrayEach(data, function(task) {
                var item = {
                    data: task,
                    priority: priority,
                    callback: typeof callback === 'function' ? callback : noop
                };

                q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

                if (q.tasks.length === q.concurrency) {
                    q.saturated();
                }
                async.setImmediate(q.process);
            });
        }

        // Start with a normal queue
        var q = async.queue(worker, concurrency);

        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
            _insert(q, data, priority, callback);
        };

        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        return _queue(worker, 1, payload);
    };

    function _console_fn(name) {
        return _restParam(function (fn, args) {
            fn.apply(null, args.concat([_restParam(function (err, args) {
                if (typeof console === 'object') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _arrayEach(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            })]));
        });
    }
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        var has = Object.prototype.hasOwnProperty;
        hasher = hasher || identity;
        var memoized = _restParam(function memoized(args) {
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (has.call(memo, key)) {   
                async.setImmediate(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (has.call(queues, key)) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([_restParam(function (args) {
                    memo[key] = args;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                        q[i].apply(null, args);
                    }
                })]));
            }
        });
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
        return function () {
            return (fn.unmemoized || fn).apply(null, arguments);
        };
    };

    function _times(mapper) {
        return function (count, iterator, callback) {
            mapper(_range(count), iterator, callback);
        };
    }

    async.times = _times(async.map);
    async.timesSeries = _times(async.mapSeries);
    async.timesLimit = function (count, limit, iterator, callback) {
        return async.mapLimit(_range(count), limit, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return _restParam(function (args) {
            var that = this;

            var callback = args[args.length - 1];
            if (typeof callback == 'function') {
                args.pop();
            } else {
                callback = noop;
            }

            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([_restParam(function (err, nextargs) {
                    cb(err, nextargs);
                })]));
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        });
    };

    async.compose = function (/* functions... */) {
        return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };


    function _applyEach(eachfn) {
        return _restParam(function(fns, args) {
            var go = _restParam(function(args) {
                var that = this;
                var callback = args.pop();
                return eachfn(fns, function (fn, _, cb) {
                    fn.apply(that, args.concat([cb]));
                },
                callback);
            });
            if (args.length) {
                return go.apply(this, args);
            }
            else {
                return go;
            }
        });
    }

    async.applyEach = _applyEach(async.eachOf);
    async.applyEachSeries = _applyEach(async.eachOfSeries);


    async.forever = function (fn, callback) {
        var done = only_once(callback || noop);
        var task = ensureAsync(fn);
        function next(err) {
            if (err) {
                return done(err);
            }
            task(next);
        }
        next();
    };

    function ensureAsync(fn) {
        return _restParam(function (args) {
            var callback = args.pop();
            args.push(function () {
                var innerArgs = arguments;
                if (sync) {
                    async.setImmediate(function () {
                        callback.apply(null, innerArgs);
                    });
                } else {
                    callback.apply(null, innerArgs);
                }
            });
            var sync = true;
            fn.apply(this, args);
            sync = false;
        });
    }

    async.ensureAsync = ensureAsync;

    async.constant = _restParam(function(values) {
        var args = [null].concat(values);
        return function (callback) {
            return callback.apply(this, args);
        };
    });

    async.wrapSync =
    async.asyncify = function asyncify(func) {
        return _restParam(function (args) {
            var callback = args.pop();
            var result;
            try {
                result = func.apply(this, args);
            } catch (e) {
                return callback(e);
            }
            // if result is Promise object
            if (_isObject(result) && typeof result.then === "function") {
                result.then(function(value) {
                    callback(null, value);
                })["catch"](function(err) {
                    callback(err.message ? err : new Error(err));
                });
            } else {
                callback(null, result);
            }
        });
    };

    // Node.js
    if (typeof module === 'object' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define === 'function' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

},{}],4:[function(require,module,exports){
'use strict';
// private property
var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";


// public method for encoding
exports.encode = function(input, utf8) {
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;

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
        }
        else if (isNaN(chr3)) {
            enc4 = 64;
        }

        output = output + _keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4);

    }

    return output;
};

// public method for decoding
exports.decode = function(input, utf8) {
    var output = "";
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

    while (i < input.length) {

        enc1 = _keyStr.indexOf(input.charAt(i++));
        enc2 = _keyStr.indexOf(input.charAt(i++));
        enc3 = _keyStr.indexOf(input.charAt(i++));
        enc4 = _keyStr.indexOf(input.charAt(i++));

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

    return output;

};

},{}],5:[function(require,module,exports){
'use strict';
function CompressedObject() {
    this.compressedSize = 0;
    this.uncompressedSize = 0;
    this.crc32 = 0;
    this.compressionMethod = null;
    this.compressedContent = null;
}

CompressedObject.prototype = {
    /**
     * Return the decompressed content in an unspecified format.
     * The format will depend on the decompressor.
     * @return {Object} the decompressed content.
     */
    getContent: function() {
        return null; // see implementation
    },
    /**
     * Return the compressed content in an unspecified format.
     * The format will depend on the compressed conten source.
     * @return {Object} the compressed content.
     */
    getCompressedContent: function() {
        return null; // see implementation
    }
};
module.exports = CompressedObject;

},{}],6:[function(require,module,exports){
'use strict';
exports.STORE = {
    magic: "\x00\x00",
    compress: function(content, compressionOptions) {
        return content; // no compression
    },
    uncompress: function(content) {
        return content; // no compression
    },
    compressInputType: null,
    uncompressInputType: null
};
exports.DEFLATE = require('./flate');

},{"./flate":11}],7:[function(require,module,exports){
'use strict';

var utils = require('./utils');

var table = [
    0x00000000, 0x77073096, 0xEE0E612C, 0x990951BA,
    0x076DC419, 0x706AF48F, 0xE963A535, 0x9E6495A3,
    0x0EDB8832, 0x79DCB8A4, 0xE0D5E91E, 0x97D2D988,
    0x09B64C2B, 0x7EB17CBD, 0xE7B82D07, 0x90BF1D91,
    0x1DB71064, 0x6AB020F2, 0xF3B97148, 0x84BE41DE,
    0x1ADAD47D, 0x6DDDE4EB, 0xF4D4B551, 0x83D385C7,
    0x136C9856, 0x646BA8C0, 0xFD62F97A, 0x8A65C9EC,
    0x14015C4F, 0x63066CD9, 0xFA0F3D63, 0x8D080DF5,
    0x3B6E20C8, 0x4C69105E, 0xD56041E4, 0xA2677172,
    0x3C03E4D1, 0x4B04D447, 0xD20D85FD, 0xA50AB56B,
    0x35B5A8FA, 0x42B2986C, 0xDBBBC9D6, 0xACBCF940,
    0x32D86CE3, 0x45DF5C75, 0xDCD60DCF, 0xABD13D59,
    0x26D930AC, 0x51DE003A, 0xC8D75180, 0xBFD06116,
    0x21B4F4B5, 0x56B3C423, 0xCFBA9599, 0xB8BDA50F,
    0x2802B89E, 0x5F058808, 0xC60CD9B2, 0xB10BE924,
    0x2F6F7C87, 0x58684C11, 0xC1611DAB, 0xB6662D3D,
    0x76DC4190, 0x01DB7106, 0x98D220BC, 0xEFD5102A,
    0x71B18589, 0x06B6B51F, 0x9FBFE4A5, 0xE8B8D433,
    0x7807C9A2, 0x0F00F934, 0x9609A88E, 0xE10E9818,
    0x7F6A0DBB, 0x086D3D2D, 0x91646C97, 0xE6635C01,
    0x6B6B51F4, 0x1C6C6162, 0x856530D8, 0xF262004E,
    0x6C0695ED, 0x1B01A57B, 0x8208F4C1, 0xF50FC457,
    0x65B0D9C6, 0x12B7E950, 0x8BBEB8EA, 0xFCB9887C,
    0x62DD1DDF, 0x15DA2D49, 0x8CD37CF3, 0xFBD44C65,
    0x4DB26158, 0x3AB551CE, 0xA3BC0074, 0xD4BB30E2,
    0x4ADFA541, 0x3DD895D7, 0xA4D1C46D, 0xD3D6F4FB,
    0x4369E96A, 0x346ED9FC, 0xAD678846, 0xDA60B8D0,
    0x44042D73, 0x33031DE5, 0xAA0A4C5F, 0xDD0D7CC9,
    0x5005713C, 0x270241AA, 0xBE0B1010, 0xC90C2086,
    0x5768B525, 0x206F85B3, 0xB966D409, 0xCE61E49F,
    0x5EDEF90E, 0x29D9C998, 0xB0D09822, 0xC7D7A8B4,
    0x59B33D17, 0x2EB40D81, 0xB7BD5C3B, 0xC0BA6CAD,
    0xEDB88320, 0x9ABFB3B6, 0x03B6E20C, 0x74B1D29A,
    0xEAD54739, 0x9DD277AF, 0x04DB2615, 0x73DC1683,
    0xE3630B12, 0x94643B84, 0x0D6D6A3E, 0x7A6A5AA8,
    0xE40ECF0B, 0x9309FF9D, 0x0A00AE27, 0x7D079EB1,
    0xF00F9344, 0x8708A3D2, 0x1E01F268, 0x6906C2FE,
    0xF762575D, 0x806567CB, 0x196C3671, 0x6E6B06E7,
    0xFED41B76, 0x89D32BE0, 0x10DA7A5A, 0x67DD4ACC,
    0xF9B9DF6F, 0x8EBEEFF9, 0x17B7BE43, 0x60B08ED5,
    0xD6D6A3E8, 0xA1D1937E, 0x38D8C2C4, 0x4FDFF252,
    0xD1BB67F1, 0xA6BC5767, 0x3FB506DD, 0x48B2364B,
    0xD80D2BDA, 0xAF0A1B4C, 0x36034AF6, 0x41047A60,
    0xDF60EFC3, 0xA867DF55, 0x316E8EEF, 0x4669BE79,
    0xCB61B38C, 0xBC66831A, 0x256FD2A0, 0x5268E236,
    0xCC0C7795, 0xBB0B4703, 0x220216B9, 0x5505262F,
    0xC5BA3BBE, 0xB2BD0B28, 0x2BB45A92, 0x5CB36A04,
    0xC2D7FFA7, 0xB5D0CF31, 0x2CD99E8B, 0x5BDEAE1D,
    0x9B64C2B0, 0xEC63F226, 0x756AA39C, 0x026D930A,
    0x9C0906A9, 0xEB0E363F, 0x72076785, 0x05005713,
    0x95BF4A82, 0xE2B87A14, 0x7BB12BAE, 0x0CB61B38,
    0x92D28E9B, 0xE5D5BE0D, 0x7CDCEFB7, 0x0BDBDF21,
    0x86D3D2D4, 0xF1D4E242, 0x68DDB3F8, 0x1FDA836E,
    0x81BE16CD, 0xF6B9265B, 0x6FB077E1, 0x18B74777,
    0x88085AE6, 0xFF0F6A70, 0x66063BCA, 0x11010B5C,
    0x8F659EFF, 0xF862AE69, 0x616BFFD3, 0x166CCF45,
    0xA00AE278, 0xD70DD2EE, 0x4E048354, 0x3903B3C2,
    0xA7672661, 0xD06016F7, 0x4969474D, 0x3E6E77DB,
    0xAED16A4A, 0xD9D65ADC, 0x40DF0B66, 0x37D83BF0,
    0xA9BCAE53, 0xDEBB9EC5, 0x47B2CF7F, 0x30B5FFE9,
    0xBDBDF21C, 0xCABAC28A, 0x53B39330, 0x24B4A3A6,
    0xBAD03605, 0xCDD70693, 0x54DE5729, 0x23D967BF,
    0xB3667A2E, 0xC4614AB8, 0x5D681B02, 0x2A6F2B94,
    0xB40BBE37, 0xC30C8EA1, 0x5A05DF1B, 0x2D02EF8D
];

/**
 *
 *  Javascript crc32
 *  http://www.webtoolkit.info/
 *
 */
module.exports = function crc32(input, crc) {
    if (typeof input === "undefined" || !input.length) {
        return 0;
    }

    var isArray = utils.getTypeOf(input) !== "string";

    if (typeof(crc) == "undefined") {
        crc = 0;
    }
    var x = 0;
    var y = 0;
    var b = 0;

    crc = crc ^ (-1);
    for (var i = 0, iTop = input.length; i < iTop; i++) {
        b = isArray ? input[i] : input.charCodeAt(i);
        y = (crc ^ b) & 0xFF;
        x = table[y];
        crc = (crc >>> 8) ^ x;
    }

    return crc ^ (-1);
};
// vim: set shiftwidth=4 softtabstop=4:

},{"./utils":24}],8:[function(require,module,exports){
'use strict';
var utils = require('./utils');

function DataReader(data) {
    this.data = null; // type : see implementation
    this.length = 0;
    this.index = 0;
}
DataReader.prototype = {
    /**
     * Check that the offset will not go too far.
     * @param {string} offset the additional offset to check.
     * @throws {Error} an Error if the offset is out of bounds.
     */
    checkOffset: function(offset) {
        this.checkIndex(this.index + offset);
    },
    /**
     * Check that the specifed index will not be too far.
     * @param {string} newIndex the index to check.
     * @throws {Error} an Error if the index is out of bounds.
     */
    checkIndex: function(newIndex) {
        if (this.length < newIndex || newIndex < 0) {
            throw new Error("End of data reached (data length = " + this.length + ", asked index = " + (newIndex) + "). Corrupted zip ?");
        }
    },
    /**
     * Change the index.
     * @param {number} newIndex The new index.
     * @throws {Error} if the new index is out of the data.
     */
    setIndex: function(newIndex) {
        this.checkIndex(newIndex);
        this.index = newIndex;
    },
    /**
     * Skip the next n bytes.
     * @param {number} n the number of bytes to skip.
     * @throws {Error} if the new index is out of the data.
     */
    skip: function(n) {
        this.setIndex(this.index + n);
    },
    /**
     * Get the byte at the specified index.
     * @param {number} i the index to use.
     * @return {number} a byte.
     */
    byteAt: function(i) {
        // see implementations
    },
    /**
     * Get the next number with a given byte size.
     * @param {number} size the number of bytes to read.
     * @return {number} the corresponding number.
     */
    readInt: function(size) {
        var result = 0,
            i;
        this.checkOffset(size);
        for (i = this.index + size - 1; i >= this.index; i--) {
            result = (result << 8) + this.byteAt(i);
        }
        this.index += size;
        return result;
    },
    /**
     * Get the next string with a given byte size.
     * @param {number} size the number of bytes to read.
     * @return {string} the corresponding string.
     */
    readString: function(size) {
        return utils.transformTo("string", this.readData(size));
    },
    /**
     * Get raw data without conversion, <size> bytes.
     * @param {number} size the number of bytes to read.
     * @return {Object} the raw data, implementation specific.
     */
    readData: function(size) {
        // see implementations
    },
    /**
     * Find the last occurence of a zip signature (4 bytes).
     * @param {string} sig the signature to find.
     * @return {number} the index of the last occurence, -1 if not found.
     */
    lastIndexOfSignature: function(sig) {
        // see implementations
    },
    /**
     * Get the next date.
     * @return {Date} the date.
     */
    readDate: function() {
        var dostime = this.readInt(4);
        return new Date(
        ((dostime >> 25) & 0x7f) + 1980, // year
        ((dostime >> 21) & 0x0f) - 1, // month
        (dostime >> 16) & 0x1f, // day
        (dostime >> 11) & 0x1f, // hour
        (dostime >> 5) & 0x3f, // minute
        (dostime & 0x1f) << 1); // second
    }
};
module.exports = DataReader;

},{"./utils":24}],9:[function(require,module,exports){
'use strict';
exports.base64 = false;
exports.binary = false;
exports.dir = false;
exports.createFolders = false;
exports.date = null;
exports.compression = null;
exports.compressionOptions = null;
exports.comment = null;
exports.unixPermissions = null;
exports.dosPermissions = null;

},{}],10:[function(require,module,exports){
'use strict';
var utils = require('./utils');

/**
 * @deprecated
 * This function will be removed in a future version without replacement.
 */
exports.string2binary = function(str) {
    return utils.string2binary(str);
};

/**
 * @deprecated
 * This function will be removed in a future version without replacement.
 */
exports.string2Uint8Array = function(str) {
    return utils.transformTo("uint8array", str);
};

/**
 * @deprecated
 * This function will be removed in a future version without replacement.
 */
exports.uint8Array2String = function(array) {
    return utils.transformTo("string", array);
};

/**
 * @deprecated
 * This function will be removed in a future version without replacement.
 */
exports.string2Blob = function(str) {
    var buffer = utils.transformTo("arraybuffer", str);
    return utils.arrayBuffer2Blob(buffer);
};

/**
 * @deprecated
 * This function will be removed in a future version without replacement.
 */
exports.arrayBuffer2Blob = function(buffer) {
    return utils.arrayBuffer2Blob(buffer);
};

/**
 * @deprecated
 * This function will be removed in a future version without replacement.
 */
exports.transformTo = function(outputType, input) {
    return utils.transformTo(outputType, input);
};

/**
 * @deprecated
 * This function will be removed in a future version without replacement.
 */
exports.getTypeOf = function(input) {
    return utils.getTypeOf(input);
};

/**
 * @deprecated
 * This function will be removed in a future version without replacement.
 */
exports.checkSupport = function(type) {
    return utils.checkSupport(type);
};

/**
 * @deprecated
 * This value will be removed in a future version without replacement.
 */
exports.MAX_VALUE_16BITS = utils.MAX_VALUE_16BITS;

/**
 * @deprecated
 * This value will be removed in a future version without replacement.
 */
exports.MAX_VALUE_32BITS = utils.MAX_VALUE_32BITS;


/**
 * @deprecated
 * This function will be removed in a future version without replacement.
 */
exports.pretty = function(str) {
    return utils.pretty(str);
};

/**
 * @deprecated
 * This function will be removed in a future version without replacement.
 */
exports.findCompression = function(compressionMethod) {
    return utils.findCompression(compressionMethod);
};

/**
 * @deprecated
 * This function will be removed in a future version without replacement.
 */
exports.isRegExp = function (object) {
    return utils.isRegExp(object);
};


},{"./utils":24}],11:[function(require,module,exports){
'use strict';
var USE_TYPEDARRAY = (typeof Uint8Array !== 'undefined') && (typeof Uint16Array !== 'undefined') && (typeof Uint32Array !== 'undefined');

var pako = require("pako");
exports.uncompressInputType = USE_TYPEDARRAY ? "uint8array" : "array";
exports.compressInputType = USE_TYPEDARRAY ? "uint8array" : "array";

exports.magic = "\x08\x00";
exports.compress = function(input, compressionOptions) {
    return pako.deflateRaw(input, {
        level : compressionOptions.level || -1 // default compression
    });
};
exports.uncompress =  function(input) {
    return pako.inflateRaw(input);
};

},{"pako":27}],12:[function(require,module,exports){
'use strict';

var base64 = require('./base64');

/**
Usage:
   zip = new JSZip();
   zip.file("hello.txt", "Hello, World!").file("tempfile", "nothing");
   zip.folder("images").file("smile.gif", base64Data, {base64: true});
   zip.file("Xmas.txt", "Ho ho ho !", {date : new Date("December 25, 2007 00:00:01")});
   zip.remove("tempfile");

   base64zip = zip.generate();

**/

/**
 * Representation a of zip file in js
 * @constructor
 * @param {String=|ArrayBuffer=|Uint8Array=} data the data to load, if any (optional).
 * @param {Object=} options the options for creating this objects (optional).
 */
function JSZip(data, options) {
    // if this constructor is used without `new`, it adds `new` before itself:
    if(!(this instanceof JSZip)) return new JSZip(data, options);

    // object containing the files :
    // {
    //   "folder/" : {...},
    //   "folder/data.txt" : {...}
    // }
    this.files = {};

    this.comment = null;

    // Where we are in the hierarchy
    this.root = "";
    if (data) {
        this.load(data, options);
    }
    this.clone = function() {
        var newObj = new JSZip();
        for (var i in this) {
            if (typeof this[i] !== "function") {
                newObj[i] = this[i];
            }
        }
        return newObj;
    };
}
JSZip.prototype = require('./object');
JSZip.prototype.load = require('./load');
JSZip.support = require('./support');
JSZip.defaults = require('./defaults');

/**
 * @deprecated
 * This namespace will be removed in a future version without replacement.
 */
JSZip.utils = require('./deprecatedPublicUtils');

JSZip.base64 = {
    /**
     * @deprecated
     * This method will be removed in a future version without replacement.
     */
    encode : function(input) {
        return base64.encode(input);
    },
    /**
     * @deprecated
     * This method will be removed in a future version without replacement.
     */
    decode : function(input) {
        return base64.decode(input);
    }
};
JSZip.compressions = require('./compressions');
module.exports = JSZip;

},{"./base64":4,"./compressions":6,"./defaults":9,"./deprecatedPublicUtils":10,"./load":13,"./object":16,"./support":20}],13:[function(require,module,exports){
'use strict';
var base64 = require('./base64');
var ZipEntries = require('./zipEntries');
module.exports = function(data, options) {
    var files, zipEntries, i, input;
    options = options || {};
    if (options.base64) {
        data = base64.decode(data);
    }

    zipEntries = new ZipEntries(data, options);
    files = zipEntries.files;
    for (i = 0; i < files.length; i++) {
        input = files[i];
        this.file(input.fileName, input.decompressed, {
            binary: true,
            optimizedBinaryString: true,
            date: input.date,
            dir: input.dir,
            comment : input.fileComment.length ? input.fileComment : null,
            unixPermissions : input.unixPermissions,
            dosPermissions : input.dosPermissions,
            createFolders: options.createFolders
        });
    }
    if (zipEntries.zipComment.length) {
        this.comment = zipEntries.zipComment;
    }

    return this;
};

},{"./base64":4,"./zipEntries":25}],14:[function(require,module,exports){
'use strict';
module.exports = function(data, encoding){
    return new Buffer(data, encoding);
};
module.exports.test = function(b){
    return Buffer.isBuffer(b);
};

},{}],15:[function(require,module,exports){
'use strict';
var Uint8ArrayReader = require('./uint8ArrayReader');

function NodeBufferReader(data) {
    this.data = data;
    this.length = this.data.length;
    this.index = 0;
}
NodeBufferReader.prototype = new Uint8ArrayReader();

/**
 * @see DataReader.readData
 */
NodeBufferReader.prototype.readData = function(size) {
    this.checkOffset(size);
    var result = this.data.slice(this.index, this.index + size);
    this.index += size;
    return result;
};
module.exports = NodeBufferReader;

},{"./uint8ArrayReader":21}],16:[function(require,module,exports){
'use strict';
var support = require('./support');
var utils = require('./utils');
var crc32 = require('./crc32');
var signature = require('./signature');
var defaults = require('./defaults');
var base64 = require('./base64');
var compressions = require('./compressions');
var CompressedObject = require('./compressedObject');
var nodeBuffer = require('./nodeBuffer');
var utf8 = require('./utf8');
var StringWriter = require('./stringWriter');
var Uint8ArrayWriter = require('./uint8ArrayWriter');

/**
 * Returns the raw data of a ZipObject, decompress the content if necessary.
 * @param {ZipObject} file the file to use.
 * @return {String|ArrayBuffer|Uint8Array|Buffer} the data.
 */
var getRawData = function(file) {
    if (file._data instanceof CompressedObject) {
        file._data = file._data.getContent();
        file.options.binary = true;
        file.options.base64 = false;

        if (utils.getTypeOf(file._data) === "uint8array") {
            var copy = file._data;
            // when reading an arraybuffer, the CompressedObject mechanism will keep it and subarray() a Uint8Array.
            // if we request a file in the same format, we might get the same Uint8Array or its ArrayBuffer (the original zip file).
            file._data = new Uint8Array(copy.length);
            // with an empty Uint8Array, Opera fails with a "Offset larger than array size"
            if (copy.length !== 0) {
                file._data.set(copy, 0);
            }
        }
    }
    return file._data;
};

/**
 * Returns the data of a ZipObject in a binary form. If the content is an unicode string, encode it.
 * @param {ZipObject} file the file to use.
 * @return {String|ArrayBuffer|Uint8Array|Buffer} the data.
 */
var getBinaryData = function(file) {
    var result = getRawData(file),
        type = utils.getTypeOf(result);
    if (type === "string") {
        if (!file.options.binary) {
            // unicode text !
            // unicode string => binary string is a painful process, check if we can avoid it.
            if (support.nodebuffer) {
                return nodeBuffer(result, "utf-8");
            }
        }
        return file.asBinary();
    }
    return result;
};

/**
 * Transform this._data into a string.
 * @param {function} filter a function String -> String, applied if not null on the result.
 * @return {String} the string representing this._data.
 */
var dataToString = function(asUTF8) {
    var result = getRawData(this);
    if (result === null || typeof result === "undefined") {
        return "";
    }
    // if the data is a base64 string, we decode it before checking the encoding !
    if (this.options.base64) {
        result = base64.decode(result);
    }
    if (asUTF8 && this.options.binary) {
        // JSZip.prototype.utf8decode supports arrays as input
        // skip to array => string step, utf8decode will do it.
        result = out.utf8decode(result);
    }
    else {
        // no utf8 transformation, do the array => string step.
        result = utils.transformTo("string", result);
    }

    if (!asUTF8 && !this.options.binary) {
        result = utils.transformTo("string", out.utf8encode(result));
    }
    return result;
};
/**
 * A simple object representing a file in the zip file.
 * @constructor
 * @param {string} name the name of the file
 * @param {String|ArrayBuffer|Uint8Array|Buffer} data the data
 * @param {Object} options the options of the file
 */
var ZipObject = function(name, data, options) {
    this.name = name;
    this.dir = options.dir;
    this.date = options.date;
    this.comment = options.comment;
    this.unixPermissions = options.unixPermissions;
    this.dosPermissions = options.dosPermissions;

    this._data = data;
    this.options = options;

    /*
     * This object contains initial values for dir and date.
     * With them, we can check if the user changed the deprecated metadata in
     * `ZipObject#options` or not.
     */
    this._initialMetadata = {
      dir : options.dir,
      date : options.date
    };
};

ZipObject.prototype = {
    /**
     * Return the content as UTF8 string.
     * @return {string} the UTF8 string.
     */
    asText: function() {
        return dataToString.call(this, true);
    },
    /**
     * Returns the binary content.
     * @return {string} the content as binary.
     */
    asBinary: function() {
        return dataToString.call(this, false);
    },
    /**
     * Returns the content as a nodejs Buffer.
     * @return {Buffer} the content as a Buffer.
     */
    asNodeBuffer: function() {
        var result = getBinaryData(this);
        return utils.transformTo("nodebuffer", result);
    },
    /**
     * Returns the content as an Uint8Array.
     * @return {Uint8Array} the content as an Uint8Array.
     */
    asUint8Array: function() {
        var result = getBinaryData(this);
        return utils.transformTo("uint8array", result);
    },
    /**
     * Returns the content as an ArrayBuffer.
     * @return {ArrayBuffer} the content as an ArrayBufer.
     */
    asArrayBuffer: function() {
        return this.asUint8Array().buffer;
    }
};

/**
 * Transform an integer into a string in hexadecimal.
 * @private
 * @param {number} dec the number to convert.
 * @param {number} bytes the number of bytes to generate.
 * @returns {string} the result.
 */
var decToHex = function(dec, bytes) {
    var hex = "",
        i;
    for (i = 0; i < bytes; i++) {
        hex += String.fromCharCode(dec & 0xff);
        dec = dec >>> 8;
    }
    return hex;
};

/**
 * Merge the objects passed as parameters into a new one.
 * @private
 * @param {...Object} var_args All objects to merge.
 * @return {Object} a new object with the data of the others.
 */
var extend = function() {
    var result = {}, i, attr;
    for (i = 0; i < arguments.length; i++) { // arguments is not enumerable in some browsers
        for (attr in arguments[i]) {
            if (arguments[i].hasOwnProperty(attr) && typeof result[attr] === "undefined") {
                result[attr] = arguments[i][attr];
            }
        }
    }
    return result;
};

/**
 * Transforms the (incomplete) options from the user into the complete
 * set of options to create a file.
 * @private
 * @param {Object} o the options from the user.
 * @return {Object} the complete set of options.
 */
var prepareFileAttrs = function(o) {
    o = o || {};
    if (o.base64 === true && (o.binary === null || o.binary === undefined)) {
        o.binary = true;
    }
    o = extend(o, defaults);
    o.date = o.date || new Date();
    if (o.compression !== null) o.compression = o.compression.toUpperCase();

    return o;
};

/**
 * Add a file in the current folder.
 * @private
 * @param {string} name the name of the file
 * @param {String|ArrayBuffer|Uint8Array|Buffer} data the data of the file
 * @param {Object} o the options of the file
 * @return {Object} the new file.
 */
var fileAdd = function(name, data, o) {
    // be sure sub folders exist
    var dataType = utils.getTypeOf(data),
        parent;

    o = prepareFileAttrs(o);

    if (typeof o.unixPermissions === "string") {
        o.unixPermissions = parseInt(o.unixPermissions, 8);
    }

    // UNX_IFDIR  0040000 see zipinfo.c
    if (o.unixPermissions && (o.unixPermissions & 0x4000)) {
        o.dir = true;
    }
    // Bit 4    Directory
    if (o.dosPermissions && (o.dosPermissions & 0x0010)) {
        o.dir = true;
    }

    if (o.dir) {
        name = forceTrailingSlash(name);
    }

    if (o.createFolders && (parent = parentFolder(name))) {
        folderAdd.call(this, parent, true);
    }

    if (o.dir || data === null || typeof data === "undefined") {
        o.base64 = false;
        o.binary = false;
        data = null;
        dataType = null;
    }
    else if (dataType === "string") {
        if (o.binary && !o.base64) {
            // optimizedBinaryString == true means that the file has already been filtered with a 0xFF mask
            if (o.optimizedBinaryString !== true) {
                // this is a string, not in a base64 format.
                // Be sure that this is a correct "binary string"
                data = utils.string2binary(data);
            }
        }
    }
    else { // arraybuffer, uint8array, ...
        o.base64 = false;
        o.binary = true;

        if (!dataType && !(data instanceof CompressedObject)) {
            throw new Error("The data of '" + name + "' is in an unsupported format !");
        }

        // special case : it's way easier to work with Uint8Array than with ArrayBuffer
        if (dataType === "arraybuffer") {
            data = utils.transformTo("uint8array", data);
        }
    }

    var object = new ZipObject(name, data, o);
    this.files[name] = object;
    return object;
};

/**
 * Find the parent folder of the path.
 * @private
 * @param {string} path the path to use
 * @return {string} the parent folder, or ""
 */
var parentFolder = function (path) {
    if (path.slice(-1) == '/') {
        path = path.substring(0, path.length - 1);
    }
    var lastSlash = path.lastIndexOf('/');
    return (lastSlash > 0) ? path.substring(0, lastSlash) : "";
};


/**
 * Returns the path with a slash at the end.
 * @private
 * @param {String} path the path to check.
 * @return {String} the path with a trailing slash.
 */
var forceTrailingSlash = function(path) {
    // Check the name ends with a /
    if (path.slice(-1) != "/") {
        path += "/"; // IE doesn't like substr(-1)
    }
    return path;
};
/**
 * Add a (sub) folder in the current folder.
 * @private
 * @param {string} name the folder's name
 * @param {boolean=} [createFolders] If true, automatically create sub
 *  folders. Defaults to false.
 * @return {Object} the new folder.
 */
var folderAdd = function(name, createFolders) {
    createFolders = (typeof createFolders !== 'undefined') ? createFolders : false;

    name = forceTrailingSlash(name);

    // Does this folder already exist?
    if (!this.files[name]) {
        fileAdd.call(this, name, null, {
            dir: true,
            createFolders: createFolders
        });
    }
    return this.files[name];
};

/**
 * Generate a JSZip.CompressedObject for a given zipOject.
 * @param {ZipObject} file the object to read.
 * @param {JSZip.compression} compression the compression to use.
 * @param {Object} compressionOptions the options to use when compressing.
 * @return {JSZip.CompressedObject} the compressed result.
 */
var generateCompressedObjectFrom = function(file, compression, compressionOptions) {
    var result = new CompressedObject(),
        content;

    // the data has not been decompressed, we might reuse things !
    if (file._data instanceof CompressedObject) {
        result.uncompressedSize = file._data.uncompressedSize;
        result.crc32 = file._data.crc32;

        if (result.uncompressedSize === 0 || file.dir) {
            compression = compressions['STORE'];
            result.compressedContent = "";
            result.crc32 = 0;
        }
        else if (file._data.compressionMethod === compression.magic) {
            result.compressedContent = file._data.getCompressedContent();
        }
        else {
            content = file._data.getContent();
            // need to decompress / recompress
            result.compressedContent = compression.compress(utils.transformTo(compression.compressInputType, content), compressionOptions);
        }
    }
    else {
        // have uncompressed data
        content = getBinaryData(file);
        if (!content || content.length === 0 || file.dir) {
            compression = compressions['STORE'];
            content = "";
        }
        result.uncompressedSize = content.length;
        result.crc32 = crc32(content);
        result.compressedContent = compression.compress(utils.transformTo(compression.compressInputType, content), compressionOptions);
    }

    result.compressedSize = result.compressedContent.length;
    result.compressionMethod = compression.magic;

    return result;
};




/**
 * Generate the UNIX part of the external file attributes.
 * @param {Object} unixPermissions the unix permissions or null.
 * @param {Boolean} isDir true if the entry is a directory, false otherwise.
 * @return {Number} a 32 bit integer.
 *
 * adapted from http://unix.stackexchange.com/questions/14705/the-zip-formats-external-file-attribute :
 *
 * TTTTsstrwxrwxrwx0000000000ADVSHR
 * ^^^^____________________________ file type, see zipinfo.c (UNX_*)
 *     ^^^_________________________ setuid, setgid, sticky
 *        ^^^^^^^^^________________ permissions
 *                 ^^^^^^^^^^______ not used ?
 *                           ^^^^^^ DOS attribute bits : Archive, Directory, Volume label, System file, Hidden, Read only
 */
var generateUnixExternalFileAttr = function (unixPermissions, isDir) {

    var result = unixPermissions;
    if (!unixPermissions) {
        // I can't use octal values in strict mode, hence the hexa.
        //  040775 => 0x41fd
        // 0100664 => 0x81b4
        result = isDir ? 0x41fd : 0x81b4;
    }

    return (result & 0xFFFF) << 16;
};

/**
 * Generate the DOS part of the external file attributes.
 * @param {Object} dosPermissions the dos permissions or null.
 * @param {Boolean} isDir true if the entry is a directory, false otherwise.
 * @return {Number} a 32 bit integer.
 *
 * Bit 0     Read-Only
 * Bit 1     Hidden
 * Bit 2     System
 * Bit 3     Volume Label
 * Bit 4     Directory
 * Bit 5     Archive
 */
var generateDosExternalFileAttr = function (dosPermissions, isDir) {

    // the dir flag is already set for compatibility

    return (dosPermissions || 0)  & 0x3F;
};

/**
 * Generate the various parts used in the construction of the final zip file.
 * @param {string} name the file name.
 * @param {ZipObject} file the file content.
 * @param {JSZip.CompressedObject} compressedObject the compressed object.
 * @param {number} offset the current offset from the start of the zip file.
 * @param {String} platform let's pretend we are this platform (change platform dependents fields)
 * @return {object} the zip parts.
 */
var generateZipParts = function(name, file, compressedObject, offset, platform) {
    var data = compressedObject.compressedContent,
        utfEncodedFileName = utils.transformTo("string", utf8.utf8encode(file.name)),
        comment = file.comment || "",
        utfEncodedComment = utils.transformTo("string", utf8.utf8encode(comment)),
        useUTF8ForFileName = utfEncodedFileName.length !== file.name.length,
        useUTF8ForComment = utfEncodedComment.length !== comment.length,
        o = file.options,
        dosTime,
        dosDate,
        extraFields = "",
        unicodePathExtraField = "",
        unicodeCommentExtraField = "",
        dir, date;


    // handle the deprecated options.dir
    if (file._initialMetadata.dir !== file.dir) {
        dir = file.dir;
    } else {
        dir = o.dir;
    }

    // handle the deprecated options.date
    if(file._initialMetadata.date !== file.date) {
        date = file.date;
    } else {
        date = o.date;
    }

    var extFileAttr = 0;
    var versionMadeBy = 0;
    if (dir) {
        // dos or unix, we set the dos dir flag
        extFileAttr |= 0x00010;
    }
    if(platform === "UNIX") {
        versionMadeBy = 0x031E; // UNIX, version 3.0
        extFileAttr |= generateUnixExternalFileAttr(file.unixPermissions, dir);
    } else { // DOS or other, fallback to DOS
        versionMadeBy = 0x0014; // DOS, version 2.0
        extFileAttr |= generateDosExternalFileAttr(file.dosPermissions, dir);
    }

    // date
    // @see http://www.delorie.com/djgpp/doc/rbinter/it/52/13.html
    // @see http://www.delorie.com/djgpp/doc/rbinter/it/65/16.html
    // @see http://www.delorie.com/djgpp/doc/rbinter/it/66/16.html

    dosTime = date.getHours();
    dosTime = dosTime << 6;
    dosTime = dosTime | date.getMinutes();
    dosTime = dosTime << 5;
    dosTime = dosTime | date.getSeconds() / 2;

    dosDate = date.getFullYear() - 1980;
    dosDate = dosDate << 4;
    dosDate = dosDate | (date.getMonth() + 1);
    dosDate = dosDate << 5;
    dosDate = dosDate | date.getDate();

    if (useUTF8ForFileName) {
        // set the unicode path extra field. unzip needs at least one extra
        // field to correctly handle unicode path, so using the path is as good
        // as any other information. This could improve the situation with
        // other archive managers too.
        // This field is usually used without the utf8 flag, with a non
        // unicode path in the header (winrar, winzip). This helps (a bit)
        // with the messy Windows' default compressed folders feature but
        // breaks on p7zip which doesn't seek the unicode path extra field.
        // So for now, UTF-8 everywhere !
        unicodePathExtraField =
            // Version
            decToHex(1, 1) +
            // NameCRC32
            decToHex(crc32(utfEncodedFileName), 4) +
            // UnicodeName
            utfEncodedFileName;

        extraFields +=
            // Info-ZIP Unicode Path Extra Field
            "\x75\x70" +
            // size
            decToHex(unicodePathExtraField.length, 2) +
            // content
            unicodePathExtraField;
    }

    if(useUTF8ForComment) {

        unicodeCommentExtraField =
            // Version
            decToHex(1, 1) +
            // CommentCRC32
            decToHex(this.crc32(utfEncodedComment), 4) +
            // UnicodeName
            utfEncodedComment;

        extraFields +=
            // Info-ZIP Unicode Path Extra Field
            "\x75\x63" +
            // size
            decToHex(unicodeCommentExtraField.length, 2) +
            // content
            unicodeCommentExtraField;
    }

    var header = "";

    // version needed to extract
    header += "\x0A\x00";
    // general purpose bit flag
    // set bit 11 if utf8
    header += (useUTF8ForFileName || useUTF8ForComment) ? "\x00\x08" : "\x00\x00";
    // compression method
    header += compressedObject.compressionMethod;
    // last mod file time
    header += decToHex(dosTime, 2);
    // last mod file date
    header += decToHex(dosDate, 2);
    // crc-32
    header += decToHex(compressedObject.crc32, 4);
    // compressed size
    header += decToHex(compressedObject.compressedSize, 4);
    // uncompressed size
    header += decToHex(compressedObject.uncompressedSize, 4);
    // file name length
    header += decToHex(utfEncodedFileName.length, 2);
    // extra field length
    header += decToHex(extraFields.length, 2);


    var fileRecord = signature.LOCAL_FILE_HEADER + header + utfEncodedFileName + extraFields;

    var dirRecord = signature.CENTRAL_FILE_HEADER +
    // version made by (00: DOS)
    decToHex(versionMadeBy, 2) +
    // file header (common to file and central directory)
    header +
    // file comment length
    decToHex(utfEncodedComment.length, 2) +
    // disk number start
    "\x00\x00" +
    // internal file attributes TODO
    "\x00\x00" +
    // external file attributes
    decToHex(extFileAttr, 4) +
    // relative offset of local header
    decToHex(offset, 4) +
    // file name
    utfEncodedFileName +
    // extra field
    extraFields +
    // file comment
    utfEncodedComment;

    return {
        fileRecord: fileRecord,
        dirRecord: dirRecord,
        compressedObject: compressedObject
    };
};


// return the actual prototype of JSZip
var out = {
    /**
     * Read an existing zip and merge the data in the current JSZip object.
     * The implementation is in jszip-load.js, don't forget to include it.
     * @param {String|ArrayBuffer|Uint8Array|Buffer} stream  The stream to load
     * @param {Object} options Options for loading the stream.
     *  options.base64 : is the stream in base64 ? default : false
     * @return {JSZip} the current JSZip object
     */
    load: function(stream, options) {
        throw new Error("Load method is not defined. Is the file jszip-load.js included ?");
    },

    /**
     * Filter nested files/folders with the specified function.
     * @param {Function} search the predicate to use :
     * function (relativePath, file) {...}
     * It takes 2 arguments : the relative path and the file.
     * @return {Array} An array of matching elements.
     */
    filter: function(search) {
        var result = [],
            filename, relativePath, file, fileClone;
        for (filename in this.files) {
            if (!this.files.hasOwnProperty(filename)) {
                continue;
            }
            file = this.files[filename];
            // return a new object, don't let the user mess with our internal objects :)
            fileClone = new ZipObject(file.name, file._data, extend(file.options));
            relativePath = filename.slice(this.root.length, filename.length);
            if (filename.slice(0, this.root.length) === this.root && // the file is in the current root
            search(relativePath, fileClone)) { // and the file matches the function
                result.push(fileClone);
            }
        }
        return result;
    },

    /**
     * Add a file to the zip file, or search a file.
     * @param   {string|RegExp} name The name of the file to add (if data is defined),
     * the name of the file to find (if no data) or a regex to match files.
     * @param   {String|ArrayBuffer|Uint8Array|Buffer} data  The file data, either raw or base64 encoded
     * @param   {Object} o     File options
     * @return  {JSZip|Object|Array} this JSZip object (when adding a file),
     * a file (when searching by string) or an array of files (when searching by regex).
     */
    file: function(name, data, o) {
        if (arguments.length === 1) {
            if (utils.isRegExp(name)) {
                var regexp = name;
                return this.filter(function(relativePath, file) {
                    return !file.dir && regexp.test(relativePath);
                });
            }
            else { // text
                return this.filter(function(relativePath, file) {
                    return !file.dir && relativePath === name;
                })[0] || null;
            }
        }
        else { // more than one argument : we have data !
            name = this.root + name;
            fileAdd.call(this, name, data, o);
        }
        return this;
    },

    /**
     * Add a directory to the zip file, or search.
     * @param   {String|RegExp} arg The name of the directory to add, or a regex to search folders.
     * @return  {JSZip} an object with the new directory as the root, or an array containing matching folders.
     */
    folder: function(arg) {
        if (!arg) {
            return this;
        }

        if (utils.isRegExp(arg)) {
            return this.filter(function(relativePath, file) {
                return file.dir && arg.test(relativePath);
            });
        }

        // else, name is a new folder
        var name = this.root + arg;
        var newFolder = folderAdd.call(this, name);

        // Allow chaining by returning a new object with this folder as the root
        var ret = this.clone();
        ret.root = newFolder.name;
        return ret;
    },

    /**
     * Delete a file, or a directory and all sub-files, from the zip
     * @param {string} name the name of the file to delete
     * @return {JSZip} this JSZip object
     */
    remove: function(name) {
        name = this.root + name;
        var file = this.files[name];
        if (!file) {
            // Look for any folders
            if (name.slice(-1) != "/") {
                name += "/";
            }
            file = this.files[name];
        }

        if (file && !file.dir) {
            // file
            delete this.files[name];
        } else {
            // maybe a folder, delete recursively
            var kids = this.filter(function(relativePath, file) {
                return file.name.slice(0, name.length) === name;
            });
            for (var i = 0; i < kids.length; i++) {
                delete this.files[kids[i].name];
            }
        }

        return this;
    },

    /**
     * Generate the complete zip file
     * @param {Object} options the options to generate the zip file :
     * - base64, (deprecated, use type instead) true to generate base64.
     * - compression, "STORE" by default.
     * - type, "base64" by default. Values are : string, base64, uint8array, arraybuffer, blob.
     * @return {String|Uint8Array|ArrayBuffer|Buffer|Blob} the zip file
     */
    generate: function(options) {
        options = extend(options || {}, {
            base64: true,
            compression: "STORE",
            compressionOptions : null,
            type: "base64",
            platform: "DOS",
            comment: null,
            mimeType: 'application/zip'
        });

        utils.checkSupport(options.type);

        // accept nodejs `process.platform`
        if(
          options.platform === 'darwin' ||
          options.platform === 'freebsd' ||
          options.platform === 'linux' ||
          options.platform === 'sunos'
        ) {
          options.platform = "UNIX";
        }
        if (options.platform === 'win32') {
          options.platform = "DOS";
        }

        var zipData = [],
            localDirLength = 0,
            centralDirLength = 0,
            writer, i,
            utfEncodedComment = utils.transformTo("string", this.utf8encode(options.comment || this.comment || ""));

        // first, generate all the zip parts.
        for (var name in this.files) {
            if (!this.files.hasOwnProperty(name)) {
                continue;
            }
            var file = this.files[name];

            var compressionName = file.options.compression || options.compression.toUpperCase();
            var compression = compressions[compressionName];
            if (!compression) {
                throw new Error(compressionName + " is not a valid compression method !");
            }
            var compressionOptions = file.options.compressionOptions || options.compressionOptions || {};

            var compressedObject = generateCompressedObjectFrom.call(this, file, compression, compressionOptions);

            var zipPart = generateZipParts.call(this, name, file, compressedObject, localDirLength, options.platform);
            localDirLength += zipPart.fileRecord.length + compressedObject.compressedSize;
            centralDirLength += zipPart.dirRecord.length;
            zipData.push(zipPart);
        }

        var dirEnd = "";

        // end of central dir signature
        dirEnd = signature.CENTRAL_DIRECTORY_END +
        // number of this disk
        "\x00\x00" +
        // number of the disk with the start of the central directory
        "\x00\x00" +
        // total number of entries in the central directory on this disk
        decToHex(zipData.length, 2) +
        // total number of entries in the central directory
        decToHex(zipData.length, 2) +
        // size of the central directory   4 bytes
        decToHex(centralDirLength, 4) +
        // offset of start of central directory with respect to the starting disk number
        decToHex(localDirLength, 4) +
        // .ZIP file comment length
        decToHex(utfEncodedComment.length, 2) +
        // .ZIP file comment
        utfEncodedComment;


        // we have all the parts (and the total length)
        // time to create a writer !
        var typeName = options.type.toLowerCase();
        if(typeName==="uint8array"||typeName==="arraybuffer"||typeName==="blob"||typeName==="nodebuffer") {
            writer = new Uint8ArrayWriter(localDirLength + centralDirLength + dirEnd.length);
        }else{
            writer = new StringWriter(localDirLength + centralDirLength + dirEnd.length);
        }

        for (i = 0; i < zipData.length; i++) {
            writer.append(zipData[i].fileRecord);
            writer.append(zipData[i].compressedObject.compressedContent);
        }
        for (i = 0; i < zipData.length; i++) {
            writer.append(zipData[i].dirRecord);
        }

        writer.append(dirEnd);

        var zip = writer.finalize();



        switch(options.type.toLowerCase()) {
            // case "zip is an Uint8Array"
            case "uint8array" :
            case "arraybuffer" :
            case "nodebuffer" :
               return utils.transformTo(options.type.toLowerCase(), zip);
            case "blob" :
               return utils.arrayBuffer2Blob(utils.transformTo("arraybuffer", zip), options.mimeType);
            // case "zip is a string"
            case "base64" :
               return (options.base64) ? base64.encode(zip) : zip;
            default : // case "string" :
               return zip;
         }

    },

    /**
     * @deprecated
     * This method will be removed in a future version without replacement.
     */
    crc32: function (input, crc) {
        return crc32(input, crc);
    },

    /**
     * @deprecated
     * This method will be removed in a future version without replacement.
     */
    utf8encode: function (string) {
        return utils.transformTo("string", utf8.utf8encode(string));
    },

    /**
     * @deprecated
     * This method will be removed in a future version without replacement.
     */
    utf8decode: function (input) {
        return utf8.utf8decode(input);
    }
};
module.exports = out;

},{"./base64":4,"./compressedObject":5,"./compressions":6,"./crc32":7,"./defaults":9,"./nodeBuffer":14,"./signature":17,"./stringWriter":19,"./support":20,"./uint8ArrayWriter":22,"./utf8":23,"./utils":24}],17:[function(require,module,exports){
'use strict';
exports.LOCAL_FILE_HEADER = "PK\x03\x04";
exports.CENTRAL_FILE_HEADER = "PK\x01\x02";
exports.CENTRAL_DIRECTORY_END = "PK\x05\x06";
exports.ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x06\x07";
exports.ZIP64_CENTRAL_DIRECTORY_END = "PK\x06\x06";
exports.DATA_DESCRIPTOR = "PK\x07\x08";

},{}],18:[function(require,module,exports){
'use strict';
var DataReader = require('./dataReader');
var utils = require('./utils');

function StringReader(data, optimizedBinaryString) {
    this.data = data;
    if (!optimizedBinaryString) {
        this.data = utils.string2binary(this.data);
    }
    this.length = this.data.length;
    this.index = 0;
}
StringReader.prototype = new DataReader();
/**
 * @see DataReader.byteAt
 */
StringReader.prototype.byteAt = function(i) {
    return this.data.charCodeAt(i);
};
/**
 * @see DataReader.lastIndexOfSignature
 */
StringReader.prototype.lastIndexOfSignature = function(sig) {
    return this.data.lastIndexOf(sig);
};
/**
 * @see DataReader.readData
 */
StringReader.prototype.readData = function(size) {
    this.checkOffset(size);
    // this will work because the constructor applied the "& 0xff" mask.
    var result = this.data.slice(this.index, this.index + size);
    this.index += size;
    return result;
};
module.exports = StringReader;

},{"./dataReader":8,"./utils":24}],19:[function(require,module,exports){
'use strict';

var utils = require('./utils');

/**
 * An object to write any content to a string.
 * @constructor
 */
var StringWriter = function() {
    this.data = [];
};
StringWriter.prototype = {
    /**
     * Append any content to the current string.
     * @param {Object} input the content to add.
     */
    append: function(input) {
        input = utils.transformTo("string", input);
        this.data.push(input);
    },
    /**
     * Finalize the construction an return the result.
     * @return {string} the generated string.
     */
    finalize: function() {
        return this.data.join("");
    }
};

module.exports = StringWriter;

},{"./utils":24}],20:[function(require,module,exports){
'use strict';
exports.base64 = true;
exports.array = true;
exports.string = true;
exports.arraybuffer = typeof ArrayBuffer !== "undefined" && typeof Uint8Array !== "undefined";
// contains true if JSZip can read/generate nodejs Buffer, false otherwise.
// Browserify will provide a Buffer implementation for browsers, which is
// an augmented Uint8Array (i.e., can be used as either Buffer or U8).
exports.nodebuffer = typeof Buffer !== "undefined";
// contains true if JSZip can read/generate Uint8Array, false otherwise.
exports.uint8array = typeof Uint8Array !== "undefined";

if (typeof ArrayBuffer === "undefined") {
    exports.blob = false;
}
else {
    var buffer = new ArrayBuffer(0);
    try {
        exports.blob = new Blob([buffer], {
            type: "application/zip"
        }).size === 0;
    }
    catch (e) {
        try {
            var Builder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
            var builder = new Builder();
            builder.append(buffer);
            exports.blob = builder.getBlob('application/zip').size === 0;
        }
        catch (e) {
            exports.blob = false;
        }
    }
}

},{}],21:[function(require,module,exports){
'use strict';
var DataReader = require('./dataReader');

function Uint8ArrayReader(data) {
    if (data) {
        this.data = data;
        this.length = this.data.length;
        this.index = 0;
    }
}
Uint8ArrayReader.prototype = new DataReader();
/**
 * @see DataReader.byteAt
 */
Uint8ArrayReader.prototype.byteAt = function(i) {
    return this.data[i];
};
/**
 * @see DataReader.lastIndexOfSignature
 */
Uint8ArrayReader.prototype.lastIndexOfSignature = function(sig) {
    var sig0 = sig.charCodeAt(0),
        sig1 = sig.charCodeAt(1),
        sig2 = sig.charCodeAt(2),
        sig3 = sig.charCodeAt(3);
    for (var i = this.length - 4; i >= 0; --i) {
        if (this.data[i] === sig0 && this.data[i + 1] === sig1 && this.data[i + 2] === sig2 && this.data[i + 3] === sig3) {
            return i;
        }
    }

    return -1;
};
/**
 * @see DataReader.readData
 */
Uint8ArrayReader.prototype.readData = function(size) {
    this.checkOffset(size);
    if(size === 0) {
        // in IE10, when using subarray(idx, idx), we get the array [0x00] instead of [].
        return new Uint8Array(0);
    }
    var result = this.data.subarray(this.index, this.index + size);
    this.index += size;
    return result;
};
module.exports = Uint8ArrayReader;

},{"./dataReader":8}],22:[function(require,module,exports){
'use strict';

var utils = require('./utils');

/**
 * An object to write any content to an Uint8Array.
 * @constructor
 * @param {number} length The length of the array.
 */
var Uint8ArrayWriter = function(length) {
    this.data = new Uint8Array(length);
    this.index = 0;
};
Uint8ArrayWriter.prototype = {
    /**
     * Append any content to the current array.
     * @param {Object} input the content to add.
     */
    append: function(input) {
        if (input.length !== 0) {
            // with an empty Uint8Array, Opera fails with a "Offset larger than array size"
            input = utils.transformTo("uint8array", input);
            this.data.set(input, this.index);
            this.index += input.length;
        }
    },
    /**
     * Finalize the construction an return the result.
     * @return {Uint8Array} the generated array.
     */
    finalize: function() {
        return this.data;
    }
};

module.exports = Uint8ArrayWriter;

},{"./utils":24}],23:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var support = require('./support');
var nodeBuffer = require('./nodeBuffer');

/**
 * The following functions come from pako, from pako/lib/utils/strings
 * released under the MIT license, see pako https://github.com/nodeca/pako/
 */

// Table with utf8 lengths (calculated by first byte of sequence)
// Note, that 5 & 6-byte values and some 4-byte values can not be represented in JS,
// because max possible codepoint is 0x10ffff
var _utf8len = new Array(256);
for (var i=0; i<256; i++) {
  _utf8len[i] = (i >= 252 ? 6 : i >= 248 ? 5 : i >= 240 ? 4 : i >= 224 ? 3 : i >= 192 ? 2 : 1);
}
_utf8len[254]=_utf8len[254]=1; // Invalid sequence start

// convert string to array (typed, when possible)
var string2buf = function (str) {
    var buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;

    // count binary size
    for (m_pos = 0; m_pos < str_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 0xfc00) === 0xd800 && (m_pos+1 < str_len)) {
            c2 = str.charCodeAt(m_pos+1);
            if ((c2 & 0xfc00) === 0xdc00) {
                c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
                m_pos++;
            }
        }
        buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
    }

    // allocate buffer
    if (support.uint8array) {
        buf = new Uint8Array(buf_len);
    } else {
        buf = new Array(buf_len);
    }

    // convert
    for (i=0, m_pos = 0; i < buf_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 0xfc00) === 0xd800 && (m_pos+1 < str_len)) {
            c2 = str.charCodeAt(m_pos+1);
            if ((c2 & 0xfc00) === 0xdc00) {
                c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
                m_pos++;
            }
        }
        if (c < 0x80) {
            /* one byte */
            buf[i++] = c;
        } else if (c < 0x800) {
            /* two bytes */
            buf[i++] = 0xC0 | (c >>> 6);
            buf[i++] = 0x80 | (c & 0x3f);
        } else if (c < 0x10000) {
            /* three bytes */
            buf[i++] = 0xE0 | (c >>> 12);
            buf[i++] = 0x80 | (c >>> 6 & 0x3f);
            buf[i++] = 0x80 | (c & 0x3f);
        } else {
            /* four bytes */
            buf[i++] = 0xf0 | (c >>> 18);
            buf[i++] = 0x80 | (c >>> 12 & 0x3f);
            buf[i++] = 0x80 | (c >>> 6 & 0x3f);
            buf[i++] = 0x80 | (c & 0x3f);
        }
    }

    return buf;
};

// Calculate max possible position in utf8 buffer,
// that will not break sequence. If that's not possible
// - (very small limits) return max size as is.
//
// buf[] - utf8 bytes array
// max   - length limit (mandatory);
var utf8border = function(buf, max) {
    var pos;

    max = max || buf.length;
    if (max > buf.length) { max = buf.length; }

    // go back from last position, until start of sequence found
    pos = max-1;
    while (pos >= 0 && (buf[pos] & 0xC0) === 0x80) { pos--; }

    // Fuckup - very small and broken sequence,
    // return max, because we should return something anyway.
    if (pos < 0) { return max; }

    // If we came to start of buffer - that means vuffer is too small,
    // return max too.
    if (pos === 0) { return max; }

    return (pos + _utf8len[buf[pos]] > max) ? pos : max;
};

// convert array to string
var buf2string = function (buf) {
    var str, i, out, c, c_len;
    var len = buf.length;

    // Reserve max possible length (2 words per char)
    // NB: by unknown reasons, Array is significantly faster for
    //     String.fromCharCode.apply than Uint16Array.
    var utf16buf = new Array(len*2);

    for (out=0, i=0; i<len;) {
        c = buf[i++];
        // quick process ascii
        if (c < 0x80) { utf16buf[out++] = c; continue; }

        c_len = _utf8len[c];
        // skip 5 & 6 byte codes
        if (c_len > 4) { utf16buf[out++] = 0xfffd; i += c_len-1; continue; }

        // apply mask on first byte
        c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07;
        // join the rest
        while (c_len > 1 && i < len) {
            c = (c << 6) | (buf[i++] & 0x3f);
            c_len--;
        }

        // terminated by end of string?
        if (c_len > 1) { utf16buf[out++] = 0xfffd; continue; }

        if (c < 0x10000) {
            utf16buf[out++] = c;
        } else {
            c -= 0x10000;
            utf16buf[out++] = 0xd800 | ((c >> 10) & 0x3ff);
            utf16buf[out++] = 0xdc00 | (c & 0x3ff);
        }
    }

    // shrinkBuf(utf16buf, out)
    if (utf16buf.length !== out) {
        if(utf16buf.subarray) {
            utf16buf = utf16buf.subarray(0, out);
        } else {
            utf16buf.length = out;
        }
    }

    // return String.fromCharCode.apply(null, utf16buf);
    return utils.applyFromCharCode(utf16buf);
};


// That's all for the pako functions.


/**
 * Transform a javascript string into an array (typed if possible) of bytes,
 * UTF-8 encoded.
 * @param {String} str the string to encode
 * @return {Array|Uint8Array|Buffer} the UTF-8 encoded string.
 */
exports.utf8encode = function utf8encode(str) {
    if (support.nodebuffer) {
        return nodeBuffer(str, "utf-8");
    }

    return string2buf(str);
};


/**
 * Transform a bytes array (or a representation) representing an UTF-8 encoded
 * string into a javascript string.
 * @param {Array|Uint8Array|Buffer} buf the data de decode
 * @return {String} the decoded string.
 */
exports.utf8decode = function utf8decode(buf) {
    if (support.nodebuffer) {
        return utils.transformTo("nodebuffer", buf).toString("utf-8");
    }

    buf = utils.transformTo(support.uint8array ? "uint8array" : "array", buf);

    // return buf2string(buf);
    // Chrome prefers to work with "small" chunks of data
    // for the method buf2string.
    // Firefox and Chrome has their own shortcut, IE doesn't seem to really care.
    var result = [], k = 0, len = buf.length, chunk = 65536;
    while (k < len) {
        var nextBoundary = utf8border(buf, Math.min(k + chunk, len));
        if (support.uint8array) {
            result.push(buf2string(buf.subarray(k, nextBoundary)));
        } else {
            result.push(buf2string(buf.slice(k, nextBoundary)));
        }
        k = nextBoundary;
    }
    return result.join("");

};
// vim: set shiftwidth=4 softtabstop=4:

},{"./nodeBuffer":14,"./support":20,"./utils":24}],24:[function(require,module,exports){
'use strict';
var support = require('./support');
var compressions = require('./compressions');
var nodeBuffer = require('./nodeBuffer');
/**
 * Convert a string to a "binary string" : a string containing only char codes between 0 and 255.
 * @param {string} str the string to transform.
 * @return {String} the binary string.
 */
exports.string2binary = function(str) {
    var result = "";
    for (var i = 0; i < str.length; i++) {
        result += String.fromCharCode(str.charCodeAt(i) & 0xff);
    }
    return result;
};
exports.arrayBuffer2Blob = function(buffer, mimeType) {
    exports.checkSupport("blob");
  mimeType = mimeType || 'application/zip';

    try {
        // Blob constructor
        return new Blob([buffer], {
            type: mimeType
        });
    }
    catch (e) {

        try {
            // deprecated, browser only, old way
            var Builder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
            var builder = new Builder();
            builder.append(buffer);
            return builder.getBlob(mimeType);
        }
        catch (e) {

            // well, fuck ?!
            throw new Error("Bug : can't construct the Blob.");
        }
    }


};
/**
 * The identity function.
 * @param {Object} input the input.
 * @return {Object} the same input.
 */
function identity(input) {
    return input;
}

/**
 * Fill in an array with a string.
 * @param {String} str the string to use.
 * @param {Array|ArrayBuffer|Uint8Array|Buffer} array the array to fill in (will be mutated).
 * @return {Array|ArrayBuffer|Uint8Array|Buffer} the updated array.
 */
function stringToArrayLike(str, array) {
    for (var i = 0; i < str.length; ++i) {
        array[i] = str.charCodeAt(i) & 0xFF;
    }
    return array;
}

/**
 * Transform an array-like object to a string.
 * @param {Array|ArrayBuffer|Uint8Array|Buffer} array the array to transform.
 * @return {String} the result.
 */
function arrayLikeToString(array) {
    // Performances notes :
    // --------------------
    // String.fromCharCode.apply(null, array) is the fastest, see
    // see http://jsperf.com/converting-a-uint8array-to-a-string/2
    // but the stack is limited (and we can get huge arrays !).
    //
    // result += String.fromCharCode(array[i]); generate too many strings !
    //
    // This code is inspired by http://jsperf.com/arraybuffer-to-string-apply-performance/2
    var chunk = 65536;
    var result = [],
        len = array.length,
        type = exports.getTypeOf(array),
        k = 0,
        canUseApply = true;
      try {
         switch(type) {
            case "uint8array":
               String.fromCharCode.apply(null, new Uint8Array(0));
               break;
            case "nodebuffer":
               String.fromCharCode.apply(null, nodeBuffer(0));
               break;
         }
      } catch(e) {
         canUseApply = false;
      }

      // no apply : slow and painful algorithm
      // default browser on android 4.*
      if (!canUseApply) {
         var resultStr = "";
         for(var i = 0; i < array.length;i++) {
            resultStr += String.fromCharCode(array[i]);
         }
    return resultStr;
    }
    while (k < len && chunk > 1) {
        try {
            if (type === "array" || type === "nodebuffer") {
                result.push(String.fromCharCode.apply(null, array.slice(k, Math.min(k + chunk, len))));
            }
            else {
                result.push(String.fromCharCode.apply(null, array.subarray(k, Math.min(k + chunk, len))));
            }
            k += chunk;
        }
        catch (e) {
            chunk = Math.floor(chunk / 2);
        }
    }
    return result.join("");
}

exports.applyFromCharCode = arrayLikeToString;


/**
 * Copy the data from an array-like to an other array-like.
 * @param {Array|ArrayBuffer|Uint8Array|Buffer} arrayFrom the origin array.
 * @param {Array|ArrayBuffer|Uint8Array|Buffer} arrayTo the destination array which will be mutated.
 * @return {Array|ArrayBuffer|Uint8Array|Buffer} the updated destination array.
 */
function arrayLikeToArrayLike(arrayFrom, arrayTo) {
    for (var i = 0; i < arrayFrom.length; i++) {
        arrayTo[i] = arrayFrom[i];
    }
    return arrayTo;
}

// a matrix containing functions to transform everything into everything.
var transform = {};

// string to ?
transform["string"] = {
    "string": identity,
    "array": function(input) {
        return stringToArrayLike(input, new Array(input.length));
    },
    "arraybuffer": function(input) {
        return transform["string"]["uint8array"](input).buffer;
    },
    "uint8array": function(input) {
        return stringToArrayLike(input, new Uint8Array(input.length));
    },
    "nodebuffer": function(input) {
        return stringToArrayLike(input, nodeBuffer(input.length));
    }
};

// array to ?
transform["array"] = {
    "string": arrayLikeToString,
    "array": identity,
    "arraybuffer": function(input) {
        return (new Uint8Array(input)).buffer;
    },
    "uint8array": function(input) {
        return new Uint8Array(input);
    },
    "nodebuffer": function(input) {
        return nodeBuffer(input);
    }
};

// arraybuffer to ?
transform["arraybuffer"] = {
    "string": function(input) {
        return arrayLikeToString(new Uint8Array(input));
    },
    "array": function(input) {
        return arrayLikeToArrayLike(new Uint8Array(input), new Array(input.byteLength));
    },
    "arraybuffer": identity,
    "uint8array": function(input) {
        return new Uint8Array(input);
    },
    "nodebuffer": function(input) {
        return nodeBuffer(new Uint8Array(input));
    }
};

// uint8array to ?
transform["uint8array"] = {
    "string": arrayLikeToString,
    "array": function(input) {
        return arrayLikeToArrayLike(input, new Array(input.length));
    },
    "arraybuffer": function(input) {
        return input.buffer;
    },
    "uint8array": identity,
    "nodebuffer": function(input) {
        return nodeBuffer(input);
    }
};

// nodebuffer to ?
transform["nodebuffer"] = {
    "string": arrayLikeToString,
    "array": function(input) {
        return arrayLikeToArrayLike(input, new Array(input.length));
    },
    "arraybuffer": function(input) {
        return transform["nodebuffer"]["uint8array"](input).buffer;
    },
    "uint8array": function(input) {
        return arrayLikeToArrayLike(input, new Uint8Array(input.length));
    },
    "nodebuffer": identity
};

/**
 * Transform an input into any type.
 * The supported output type are : string, array, uint8array, arraybuffer, nodebuffer.
 * If no output type is specified, the unmodified input will be returned.
 * @param {String} outputType the output type.
 * @param {String|Array|ArrayBuffer|Uint8Array|Buffer} input the input to convert.
 * @throws {Error} an Error if the browser doesn't support the requested output type.
 */
exports.transformTo = function(outputType, input) {
    if (!input) {
        // undefined, null, etc
        // an empty string won't harm.
        input = "";
    }
    if (!outputType) {
        return input;
    }
    exports.checkSupport(outputType);
    var inputType = exports.getTypeOf(input);
    var result = transform[inputType][outputType](input);
    return result;
};

/**
 * Return the type of the input.
 * The type will be in a format valid for JSZip.utils.transformTo : string, array, uint8array, arraybuffer.
 * @param {Object} input the input to identify.
 * @return {String} the (lowercase) type of the input.
 */
exports.getTypeOf = function(input) {
    if (typeof input === "string") {
        return "string";
    }
    if (Object.prototype.toString.call(input) === "[object Array]") {
        return "array";
    }
    if (support.nodebuffer && nodeBuffer.test(input)) {
        return "nodebuffer";
    }
    if (support.uint8array && input instanceof Uint8Array) {
        return "uint8array";
    }
    if (support.arraybuffer && input instanceof ArrayBuffer) {
        return "arraybuffer";
    }
};

/**
 * Throw an exception if the type is not supported.
 * @param {String} type the type to check.
 * @throws {Error} an Error if the browser doesn't support the requested type.
 */
exports.checkSupport = function(type) {
    var supported = support[type.toLowerCase()];
    if (!supported) {
        throw new Error(type + " is not supported by this browser");
    }
};
exports.MAX_VALUE_16BITS = 65535;
exports.MAX_VALUE_32BITS = -1; // well, "\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF" is parsed as -1

/**
 * Prettify a string read as binary.
 * @param {string} str the string to prettify.
 * @return {string} a pretty string.
 */
exports.pretty = function(str) {
    var res = '',
        code, i;
    for (i = 0; i < (str || "").length; i++) {
        code = str.charCodeAt(i);
        res += '\\x' + (code < 16 ? "0" : "") + code.toString(16).toUpperCase();
    }
    return res;
};

/**
 * Find a compression registered in JSZip.
 * @param {string} compressionMethod the method magic to find.
 * @return {Object|null} the JSZip compression object, null if none found.
 */
exports.findCompression = function(compressionMethod) {
    for (var method in compressions) {
        if (!compressions.hasOwnProperty(method)) {
            continue;
        }
        if (compressions[method].magic === compressionMethod) {
            return compressions[method];
        }
    }
    return null;
};
/**
* Cross-window, cross-Node-context regular expression detection
* @param  {Object}  object Anything
* @return {Boolean}        true if the object is a regular expression,
* false otherwise
*/
exports.isRegExp = function (object) {
    return Object.prototype.toString.call(object) === "[object RegExp]";
};


},{"./compressions":6,"./nodeBuffer":14,"./support":20}],25:[function(require,module,exports){
'use strict';
var StringReader = require('./stringReader');
var NodeBufferReader = require('./nodeBufferReader');
var Uint8ArrayReader = require('./uint8ArrayReader');
var utils = require('./utils');
var sig = require('./signature');
var ZipEntry = require('./zipEntry');
var support = require('./support');
var jszipProto = require('./object');
//  class ZipEntries {{{
/**
 * All the entries in the zip file.
 * @constructor
 * @param {String|ArrayBuffer|Uint8Array} data the binary stream to load.
 * @param {Object} loadOptions Options for loading the stream.
 */
function ZipEntries(data, loadOptions) {
    this.files = [];
    this.loadOptions = loadOptions;
    if (data) {
        this.load(data);
    }
}
ZipEntries.prototype = {
    /**
     * Check that the reader is on the speficied signature.
     * @param {string} expectedSignature the expected signature.
     * @throws {Error} if it is an other signature.
     */
    checkSignature: function(expectedSignature) {
        var signature = this.reader.readString(4);
        if (signature !== expectedSignature) {
            throw new Error("Corrupted zip or bug : unexpected signature " + "(" + utils.pretty(signature) + ", expected " + utils.pretty(expectedSignature) + ")");
        }
    },
    /**
     * Read the end of the central directory.
     */
    readBlockEndOfCentral: function() {
        this.diskNumber = this.reader.readInt(2);
        this.diskWithCentralDirStart = this.reader.readInt(2);
        this.centralDirRecordsOnThisDisk = this.reader.readInt(2);
        this.centralDirRecords = this.reader.readInt(2);
        this.centralDirSize = this.reader.readInt(4);
        this.centralDirOffset = this.reader.readInt(4);

        this.zipCommentLength = this.reader.readInt(2);
        // warning : the encoding depends of the system locale
        // On a linux machine with LANG=en_US.utf8, this field is utf8 encoded.
        // On a windows machine, this field is encoded with the localized windows code page.
        this.zipComment = this.reader.readString(this.zipCommentLength);
        // To get consistent behavior with the generation part, we will assume that
        // this is utf8 encoded.
        this.zipComment = jszipProto.utf8decode(this.zipComment);
    },
    /**
     * Read the end of the Zip 64 central directory.
     * Not merged with the method readEndOfCentral :
     * The end of central can coexist with its Zip64 brother,
     * I don't want to read the wrong number of bytes !
     */
    readBlockZip64EndOfCentral: function() {
        this.zip64EndOfCentralSize = this.reader.readInt(8);
        this.versionMadeBy = this.reader.readString(2);
        this.versionNeeded = this.reader.readInt(2);
        this.diskNumber = this.reader.readInt(4);
        this.diskWithCentralDirStart = this.reader.readInt(4);
        this.centralDirRecordsOnThisDisk = this.reader.readInt(8);
        this.centralDirRecords = this.reader.readInt(8);
        this.centralDirSize = this.reader.readInt(8);
        this.centralDirOffset = this.reader.readInt(8);

        this.zip64ExtensibleData = {};
        var extraDataSize = this.zip64EndOfCentralSize - 44,
            index = 0,
            extraFieldId,
            extraFieldLength,
            extraFieldValue;
        while (index < extraDataSize) {
            extraFieldId = this.reader.readInt(2);
            extraFieldLength = this.reader.readInt(4);
            extraFieldValue = this.reader.readString(extraFieldLength);
            this.zip64ExtensibleData[extraFieldId] = {
                id: extraFieldId,
                length: extraFieldLength,
                value: extraFieldValue
            };
        }
    },
    /**
     * Read the end of the Zip 64 central directory locator.
     */
    readBlockZip64EndOfCentralLocator: function() {
        this.diskWithZip64CentralDirStart = this.reader.readInt(4);
        this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8);
        this.disksCount = this.reader.readInt(4);
        if (this.disksCount > 1) {
            throw new Error("Multi-volumes zip are not supported");
        }
    },
    /**
     * Read the local files, based on the offset read in the central part.
     */
    readLocalFiles: function() {
        var i, file;
        for (i = 0; i < this.files.length; i++) {
            file = this.files[i];
            this.reader.setIndex(file.localHeaderOffset);
            this.checkSignature(sig.LOCAL_FILE_HEADER);
            file.readLocalPart(this.reader);
            file.handleUTF8();
            file.processAttributes();
        }
    },
    /**
     * Read the central directory.
     */
    readCentralDir: function() {
        var file;

        this.reader.setIndex(this.centralDirOffset);
        while (this.reader.readString(4) === sig.CENTRAL_FILE_HEADER) {
            file = new ZipEntry({
                zip64: this.zip64
            }, this.loadOptions);
            file.readCentralPart(this.reader);
            this.files.push(file);
        }
    },
    /**
     * Read the end of central directory.
     */
    readEndOfCentral: function() {
        var offset = this.reader.lastIndexOfSignature(sig.CENTRAL_DIRECTORY_END);
        if (offset === -1) {
            // Check if the content is a truncated zip or complete garbage.
            // A "LOCAL_FILE_HEADER" is not required at the beginning (auto
            // extractible zip for example) but it can give a good hint.
            // If an ajax request was used without responseType, we will also
            // get unreadable data.
            var isGarbage = true;
            try {
                this.reader.setIndex(0);
                this.checkSignature(sig.LOCAL_FILE_HEADER);
                isGarbage = false;
            } catch (e) {}

            if (isGarbage) {
                throw new Error("Can't find end of central directory : is this a zip file ? " +
                                "If it is, see http://stuk.github.io/jszip/documentation/howto/read_zip.html");
            } else {
                throw new Error("Corrupted zip : can't find end of central directory");
            }
        }
        this.reader.setIndex(offset);
        this.checkSignature(sig.CENTRAL_DIRECTORY_END);
        this.readBlockEndOfCentral();


        /* extract from the zip spec :
            4)  If one of the fields in the end of central directory
                record is too small to hold required data, the field
                should be set to -1 (0xFFFF or 0xFFFFFFFF) and the
                ZIP64 format record should be created.
            5)  The end of central directory record and the
                Zip64 end of central directory locator record must
                reside on the same disk when splitting or spanning
                an archive.
         */
        if (this.diskNumber === utils.MAX_VALUE_16BITS || this.diskWithCentralDirStart === utils.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === utils.MAX_VALUE_16BITS || this.centralDirRecords === utils.MAX_VALUE_16BITS || this.centralDirSize === utils.MAX_VALUE_32BITS || this.centralDirOffset === utils.MAX_VALUE_32BITS) {
            this.zip64 = true;

            /*
            Warning : the zip64 extension is supported, but ONLY if the 64bits integer read from
            the zip file can fit into a 32bits integer. This cannot be solved : Javascript represents
            all numbers as 64-bit double precision IEEE 754 floating point numbers.
            So, we have 53bits for integers and bitwise operations treat everything as 32bits.
            see https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Operators/Bitwise_Operators
            and http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-262.pdf section 8.5
            */

            // should look for a zip64 EOCD locator
            offset = this.reader.lastIndexOfSignature(sig.ZIP64_CENTRAL_DIRECTORY_LOCATOR);
            if (offset === -1) {
                throw new Error("Corrupted zip : can't find the ZIP64 end of central directory locator");
            }
            this.reader.setIndex(offset);
            this.checkSignature(sig.ZIP64_CENTRAL_DIRECTORY_LOCATOR);
            this.readBlockZip64EndOfCentralLocator();

            // now the zip64 EOCD record
            this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir);
            this.checkSignature(sig.ZIP64_CENTRAL_DIRECTORY_END);
            this.readBlockZip64EndOfCentral();
        }
    },
    prepareReader: function(data) {
        var type = utils.getTypeOf(data);
        if (type === "string" && !support.uint8array) {
            this.reader = new StringReader(data, this.loadOptions.optimizedBinaryString);
        }
        else if (type === "nodebuffer") {
            this.reader = new NodeBufferReader(data);
        }
        else {
            this.reader = new Uint8ArrayReader(utils.transformTo("uint8array", data));
        }
    },
    /**
     * Read a zip file and create ZipEntries.
     * @param {String|ArrayBuffer|Uint8Array|Buffer} data the binary string representing a zip file.
     */
    load: function(data) {
        this.prepareReader(data);
        this.readEndOfCentral();
        this.readCentralDir();
        this.readLocalFiles();
    }
};
// }}} end of ZipEntries
module.exports = ZipEntries;

},{"./nodeBufferReader":15,"./object":16,"./signature":17,"./stringReader":18,"./support":20,"./uint8ArrayReader":21,"./utils":24,"./zipEntry":26}],26:[function(require,module,exports){
'use strict';
var StringReader = require('./stringReader');
var utils = require('./utils');
var CompressedObject = require('./compressedObject');
var jszipProto = require('./object');

var MADE_BY_DOS = 0x00;
var MADE_BY_UNIX = 0x03;

// class ZipEntry {{{
/**
 * An entry in the zip file.
 * @constructor
 * @param {Object} options Options of the current file.
 * @param {Object} loadOptions Options for loading the stream.
 */
function ZipEntry(options, loadOptions) {
    this.options = options;
    this.loadOptions = loadOptions;
}
ZipEntry.prototype = {
    /**
     * say if the file is encrypted.
     * @return {boolean} true if the file is encrypted, false otherwise.
     */
    isEncrypted: function() {
        // bit 1 is set
        return (this.bitFlag & 0x0001) === 0x0001;
    },
    /**
     * say if the file has utf-8 filename/comment.
     * @return {boolean} true if the filename/comment is in utf-8, false otherwise.
     */
    useUTF8: function() {
        // bit 11 is set
        return (this.bitFlag & 0x0800) === 0x0800;
    },
    /**
     * Prepare the function used to generate the compressed content from this ZipFile.
     * @param {DataReader} reader the reader to use.
     * @param {number} from the offset from where we should read the data.
     * @param {number} length the length of the data to read.
     * @return {Function} the callback to get the compressed content (the type depends of the DataReader class).
     */
    prepareCompressedContent: function(reader, from, length) {
        return function() {
            var previousIndex = reader.index;
            reader.setIndex(from);
            var compressedFileData = reader.readData(length);
            reader.setIndex(previousIndex);

            return compressedFileData;
        };
    },
    /**
     * Prepare the function used to generate the uncompressed content from this ZipFile.
     * @param {DataReader} reader the reader to use.
     * @param {number} from the offset from where we should read the data.
     * @param {number} length the length of the data to read.
     * @param {JSZip.compression} compression the compression used on this file.
     * @param {number} uncompressedSize the uncompressed size to expect.
     * @return {Function} the callback to get the uncompressed content (the type depends of the DataReader class).
     */
    prepareContent: function(reader, from, length, compression, uncompressedSize) {
        return function() {

            var compressedFileData = utils.transformTo(compression.uncompressInputType, this.getCompressedContent());
            var uncompressedFileData = compression.uncompress(compressedFileData);

            if (uncompressedFileData.length !== uncompressedSize) {
                throw new Error("Bug : uncompressed data size mismatch");
            }

            return uncompressedFileData;
        };
    },
    /**
     * Read the local part of a zip file and add the info in this object.
     * @param {DataReader} reader the reader to use.
     */
    readLocalPart: function(reader) {
        var compression, localExtraFieldsLength;

        // we already know everything from the central dir !
        // If the central dir data are false, we are doomed.
        // On the bright side, the local part is scary  : zip64, data descriptors, both, etc.
        // The less data we get here, the more reliable this should be.
        // Let's skip the whole header and dash to the data !
        reader.skip(22);
        // in some zip created on windows, the filename stored in the central dir contains \ instead of /.
        // Strangely, the filename here is OK.
        // I would love to treat these zip files as corrupted (see http://www.info-zip.org/FAQ.html#backslashes
        // or APPNOTE#4.4.17.1, "All slashes MUST be forward slashes '/'") but there are a lot of bad zip generators...
        // Search "unzip mismatching "local" filename continuing with "central" filename version" on
        // the internet.
        //
        // I think I see the logic here : the central directory is used to display
        // content and the local directory is used to extract the files. Mixing / and \
        // may be used to display \ to windows users and use / when extracting the files.
        // Unfortunately, this lead also to some issues : http://seclists.org/fulldisclosure/2009/Sep/394
        this.fileNameLength = reader.readInt(2);
        localExtraFieldsLength = reader.readInt(2); // can't be sure this will be the same as the central dir
        this.fileName = reader.readString(this.fileNameLength);
        reader.skip(localExtraFieldsLength);

        if (this.compressedSize == -1 || this.uncompressedSize == -1) {
            throw new Error("Bug or corrupted zip : didn't get enough informations from the central directory " + "(compressedSize == -1 || uncompressedSize == -1)");
        }

        compression = utils.findCompression(this.compressionMethod);
        if (compression === null) { // no compression found
            throw new Error("Corrupted zip : compression " + utils.pretty(this.compressionMethod) + " unknown (inner file : " + this.fileName + ")");
        }
        this.decompressed = new CompressedObject();
        this.decompressed.compressedSize = this.compressedSize;
        this.decompressed.uncompressedSize = this.uncompressedSize;
        this.decompressed.crc32 = this.crc32;
        this.decompressed.compressionMethod = this.compressionMethod;
        this.decompressed.getCompressedContent = this.prepareCompressedContent(reader, reader.index, this.compressedSize, compression);
        this.decompressed.getContent = this.prepareContent(reader, reader.index, this.compressedSize, compression, this.uncompressedSize);

        // we need to compute the crc32...
        if (this.loadOptions.checkCRC32) {
            this.decompressed = utils.transformTo("string", this.decompressed.getContent());
            if (jszipProto.crc32(this.decompressed) !== this.crc32) {
                throw new Error("Corrupted zip : CRC32 mismatch");
            }
        }
    },

    /**
     * Read the central part of a zip file and add the info in this object.
     * @param {DataReader} reader the reader to use.
     */
    readCentralPart: function(reader) {
        this.versionMadeBy = reader.readInt(2);
        this.versionNeeded = reader.readInt(2);
        this.bitFlag = reader.readInt(2);
        this.compressionMethod = reader.readString(2);
        this.date = reader.readDate();
        this.crc32 = reader.readInt(4);
        this.compressedSize = reader.readInt(4);
        this.uncompressedSize = reader.readInt(4);
        this.fileNameLength = reader.readInt(2);
        this.extraFieldsLength = reader.readInt(2);
        this.fileCommentLength = reader.readInt(2);
        this.diskNumberStart = reader.readInt(2);
        this.internalFileAttributes = reader.readInt(2);
        this.externalFileAttributes = reader.readInt(4);
        this.localHeaderOffset = reader.readInt(4);

        if (this.isEncrypted()) {
            throw new Error("Encrypted zip are not supported");
        }

        this.fileName = reader.readString(this.fileNameLength);
        this.readExtraFields(reader);
        this.parseZIP64ExtraField(reader);
        this.fileComment = reader.readString(this.fileCommentLength);
    },

    /**
     * Parse the external file attributes and get the unix/dos permissions.
     */
    processAttributes: function () {
        this.unixPermissions = null;
        this.dosPermissions = null;
        var madeBy = this.versionMadeBy >> 8;

        // Check if we have the DOS directory flag set.
        // We look for it in the DOS and UNIX permissions
        // but some unknown platform could set it as a compatibility flag.
        this.dir = this.externalFileAttributes & 0x0010 ? true : false;

        if(madeBy === MADE_BY_DOS) {
            // first 6 bits (0 to 5)
            this.dosPermissions = this.externalFileAttributes & 0x3F;
        }

        if(madeBy === MADE_BY_UNIX) {
            this.unixPermissions = (this.externalFileAttributes >> 16) & 0xFFFF;
            // the octal permissions are in (this.unixPermissions & 0x01FF).toString(8);
        }

        // fail safe : if the name ends with a / it probably means a folder
        if (!this.dir && this.fileName.slice(-1) === '/') {
            this.dir = true;
        }
    },

    /**
     * Parse the ZIP64 extra field and merge the info in the current ZipEntry.
     * @param {DataReader} reader the reader to use.
     */
    parseZIP64ExtraField: function(reader) {

        if (!this.extraFields[0x0001]) {
            return;
        }

        // should be something, preparing the extra reader
        var extraReader = new StringReader(this.extraFields[0x0001].value);

        // I really hope that these 64bits integer can fit in 32 bits integer, because js
        // won't let us have more.
        if (this.uncompressedSize === utils.MAX_VALUE_32BITS) {
            this.uncompressedSize = extraReader.readInt(8);
        }
        if (this.compressedSize === utils.MAX_VALUE_32BITS) {
            this.compressedSize = extraReader.readInt(8);
        }
        if (this.localHeaderOffset === utils.MAX_VALUE_32BITS) {
            this.localHeaderOffset = extraReader.readInt(8);
        }
        if (this.diskNumberStart === utils.MAX_VALUE_32BITS) {
            this.diskNumberStart = extraReader.readInt(4);
        }
    },
    /**
     * Read the central part of a zip file and add the info in this object.
     * @param {DataReader} reader the reader to use.
     */
    readExtraFields: function(reader) {
        var start = reader.index,
            extraFieldId,
            extraFieldLength,
            extraFieldValue;

        this.extraFields = this.extraFields || {};

        while (reader.index < start + this.extraFieldsLength) {
            extraFieldId = reader.readInt(2);
            extraFieldLength = reader.readInt(2);
            extraFieldValue = reader.readString(extraFieldLength);

            this.extraFields[extraFieldId] = {
                id: extraFieldId,
                length: extraFieldLength,
                value: extraFieldValue
            };
        }
    },
    /**
     * Apply an UTF8 transformation if needed.
     */
    handleUTF8: function() {
        if (this.useUTF8()) {
            this.fileName = jszipProto.utf8decode(this.fileName);
            this.fileComment = jszipProto.utf8decode(this.fileComment);
        } else {
            var upath = this.findExtraFieldUnicodePath();
            if (upath !== null) {
                this.fileName = upath;
            }
            var ucomment = this.findExtraFieldUnicodeComment();
            if (ucomment !== null) {
                this.fileComment = ucomment;
            }
        }
    },

    /**
     * Find the unicode path declared in the extra field, if any.
     * @return {String} the unicode path, null otherwise.
     */
    findExtraFieldUnicodePath: function() {
        var upathField = this.extraFields[0x7075];
        if (upathField) {
            var extraReader = new StringReader(upathField.value);

            // wrong version
            if (extraReader.readInt(1) !== 1) {
                return null;
            }

            // the crc of the filename changed, this field is out of date.
            if (jszipProto.crc32(this.fileName) !== extraReader.readInt(4)) {
                return null;
            }

            return jszipProto.utf8decode(extraReader.readString(upathField.length - 5));
        }
        return null;
    },

    /**
     * Find the unicode comment declared in the extra field, if any.
     * @return {String} the unicode comment, null otherwise.
     */
    findExtraFieldUnicodeComment: function() {
        var ucommentField = this.extraFields[0x6375];
        if (ucommentField) {
            var extraReader = new StringReader(ucommentField.value);

            // wrong version
            if (extraReader.readInt(1) !== 1) {
                return null;
            }

            // the crc of the comment changed, this field is out of date.
            if (jszipProto.crc32(this.fileComment) !== extraReader.readInt(4)) {
                return null;
            }

            return jszipProto.utf8decode(extraReader.readString(ucommentField.length - 5));
        }
        return null;
    }
};
module.exports = ZipEntry;

},{"./compressedObject":5,"./object":16,"./stringReader":18,"./utils":24}],27:[function(require,module,exports){
// Top level file is just a mixin of submodules & constants
'use strict';

var assign    = require('./lib/utils/common').assign;

var deflate   = require('./lib/deflate');
var inflate   = require('./lib/inflate');
var constants = require('./lib/zlib/constants');

var pako = {};

assign(pako, deflate, inflate, constants);

module.exports = pako;

},{"./lib/deflate":28,"./lib/inflate":29,"./lib/utils/common":30,"./lib/zlib/constants":33}],28:[function(require,module,exports){
'use strict';


var zlib_deflate = require('./zlib/deflate.js');
var utils = require('./utils/common');
var strings = require('./utils/strings');
var msg = require('./zlib/messages');
var zstream = require('./zlib/zstream');

var toString = Object.prototype.toString;

/* Public constants ==========================================================*/
/* ===========================================================================*/

var Z_NO_FLUSH      = 0;
var Z_FINISH        = 4;

var Z_OK            = 0;
var Z_STREAM_END    = 1;
var Z_SYNC_FLUSH    = 2;

var Z_DEFAULT_COMPRESSION = -1;

var Z_DEFAULT_STRATEGY    = 0;

var Z_DEFLATED  = 8;

/* ===========================================================================*/


/**
 * class Deflate
 *
 * Generic JS-style wrapper for zlib calls. If you don't need
 * streaming behaviour - use more simple functions: [[deflate]],
 * [[deflateRaw]] and [[gzip]].
 **/

/* internal
 * Deflate.chunks -> Array
 *
 * Chunks of output data, if [[Deflate#onData]] not overriden.
 **/

/**
 * Deflate.result -> Uint8Array|Array
 *
 * Compressed result, generated by default [[Deflate#onData]]
 * and [[Deflate#onEnd]] handlers. Filled after you push last chunk
 * (call [[Deflate#push]] with `Z_FINISH` / `true` param)  or if you
 * push a chunk with explicit flush (call [[Deflate#push]] with
 * `Z_SYNC_FLUSH` param).
 **/

/**
 * Deflate.err -> Number
 *
 * Error code after deflate finished. 0 (Z_OK) on success.
 * You will not need it in real life, because deflate errors
 * are possible only on wrong options or bad `onData` / `onEnd`
 * custom handlers.
 **/

/**
 * Deflate.msg -> String
 *
 * Error message, if [[Deflate.err]] != 0
 **/


/**
 * new Deflate(options)
 * - options (Object): zlib deflate options.
 *
 * Creates new deflator instance with specified params. Throws exception
 * on bad params. Supported options:
 *
 * - `level`
 * - `windowBits`
 * - `memLevel`
 * - `strategy`
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information on these.
 *
 * Additional options, for internal needs:
 *
 * - `chunkSize` - size of generated data chunks (16K by default)
 * - `raw` (Boolean) - do raw deflate
 * - `gzip` (Boolean) - create gzip wrapper
 * - `to` (String) - if equal to 'string', then result will be "binary string"
 *    (each char code [0..255])
 * - `header` (Object) - custom header for gzip
 *   - `text` (Boolean) - true if compressed data believed to be text
 *   - `time` (Number) - modification time, unix timestamp
 *   - `os` (Number) - operation system code
 *   - `extra` (Array) - array of bytes with extra data (max 65536)
 *   - `name` (String) - file name (binary string)
 *   - `comment` (String) - comment (binary string)
 *   - `hcrc` (Boolean) - true if header crc should be added
 *
 * ##### Example:
 *
 * ```javascript
 * var pako = require('pako')
 *   , chunk1 = Uint8Array([1,2,3,4,5,6,7,8,9])
 *   , chunk2 = Uint8Array([10,11,12,13,14,15,16,17,18,19]);
 *
 * var deflate = new pako.Deflate({ level: 3});
 *
 * deflate.push(chunk1, false);
 * deflate.push(chunk2, true);  // true -> last chunk
 *
 * if (deflate.err) { throw new Error(deflate.err); }
 *
 * console.log(deflate.result);
 * ```
 **/
var Deflate = function(options) {

  this.options = utils.assign({
    level: Z_DEFAULT_COMPRESSION,
    method: Z_DEFLATED,
    chunkSize: 16384,
    windowBits: 15,
    memLevel: 8,
    strategy: Z_DEFAULT_STRATEGY,
    to: ''
  }, options || {});

  var opt = this.options;

  if (opt.raw && (opt.windowBits > 0)) {
    opt.windowBits = -opt.windowBits;
  }

  else if (opt.gzip && (opt.windowBits > 0) && (opt.windowBits < 16)) {
    opt.windowBits += 16;
  }

  this.err    = 0;      // error code, if happens (0 = Z_OK)
  this.msg    = '';     // error message
  this.ended  = false;  // used to avoid multiple onEnd() calls
  this.chunks = [];     // chunks of compressed data

  this.strm = new zstream();
  this.strm.avail_out = 0;

  var status = zlib_deflate.deflateInit2(
    this.strm,
    opt.level,
    opt.method,
    opt.windowBits,
    opt.memLevel,
    opt.strategy
  );

  if (status !== Z_OK) {
    throw new Error(msg[status]);
  }

  if (opt.header) {
    zlib_deflate.deflateSetHeader(this.strm, opt.header);
  }
};

/**
 * Deflate#push(data[, mode]) -> Boolean
 * - data (Uint8Array|Array|ArrayBuffer|String): input data. Strings will be
 *   converted to utf8 byte sequence.
 * - mode (Number|Boolean): 0..6 for corresponding Z_NO_FLUSH..Z_TREE modes.
 *   See constants. Skipped or `false` means Z_NO_FLUSH, `true` meansh Z_FINISH.
 *
 * Sends input data to deflate pipe, generating [[Deflate#onData]] calls with
 * new compressed chunks. Returns `true` on success. The last data block must have
 * mode Z_FINISH (or `true`). That will flush internal pending buffers and call
 * [[Deflate#onEnd]]. For interim explicit flushes (without ending the stream) you
 * can use mode Z_SYNC_FLUSH, keeping the compression context.
 *
 * On fail call [[Deflate#onEnd]] with error code and return false.
 *
 * We strongly recommend to use `Uint8Array` on input for best speed (output
 * array format is detected automatically). Also, don't skip last param and always
 * use the same type in your code (boolean or number). That will improve JS speed.
 *
 * For regular `Array`-s make sure all elements are [0..255].
 *
 * ##### Example
 *
 * ```javascript
 * push(chunk, false); // push one of data chunks
 * ...
 * push(chunk, true);  // push last chunk
 * ```
 **/
Deflate.prototype.push = function(data, mode) {
  var strm = this.strm;
  var chunkSize = this.options.chunkSize;
  var status, _mode;

  if (this.ended) { return false; }

  _mode = (mode === ~~mode) ? mode : ((mode === true) ? Z_FINISH : Z_NO_FLUSH);

  // Convert data if needed
  if (typeof data === 'string') {
    // If we need to compress text, change encoding to utf8.
    strm.input = strings.string2buf(data);
  } else if (toString.call(data) === '[object ArrayBuffer]') {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }

  strm.next_in = 0;
  strm.avail_in = strm.input.length;

  do {
    if (strm.avail_out === 0) {
      strm.output = new utils.Buf8(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }
    status = zlib_deflate.deflate(strm, _mode);    /* no bad return value */

    if (status !== Z_STREAM_END && status !== Z_OK) {
      this.onEnd(status);
      this.ended = true;
      return false;
    }
    if (strm.avail_out === 0 || (strm.avail_in === 0 && (_mode === Z_FINISH || _mode === Z_SYNC_FLUSH))) {
      if (this.options.to === 'string') {
        this.onData(strings.buf2binstring(utils.shrinkBuf(strm.output, strm.next_out)));
      } else {
        this.onData(utils.shrinkBuf(strm.output, strm.next_out));
      }
    }
  } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== Z_STREAM_END);

  // Finalize on the last chunk.
  if (_mode === Z_FINISH) {
    status = zlib_deflate.deflateEnd(this.strm);
    this.onEnd(status);
    this.ended = true;
    return status === Z_OK;
  }

  // callback interim results if Z_SYNC_FLUSH.
  if (_mode === Z_SYNC_FLUSH) {
    this.onEnd(Z_OK);
    strm.avail_out = 0;
    return true;
  }

  return true;
};


/**
 * Deflate#onData(chunk) -> Void
 * - chunk (Uint8Array|Array|String): ouput data. Type of array depends
 *   on js engine support. When string output requested, each chunk
 *   will be string.
 *
 * By default, stores data blocks in `chunks[]` property and glue
 * those in `onEnd`. Override this handler, if you need another behaviour.
 **/
Deflate.prototype.onData = function(chunk) {
  this.chunks.push(chunk);
};


/**
 * Deflate#onEnd(status) -> Void
 * - status (Number): deflate status. 0 (Z_OK) on success,
 *   other if not.
 *
 * Called once after you tell deflate that the input stream is
 * complete (Z_FINISH) or should be flushed (Z_SYNC_FLUSH)
 * or if an error happened. By default - join collected chunks,
 * free memory and fill `results` / `err` properties.
 **/
Deflate.prototype.onEnd = function(status) {
  // On success - join
  if (status === Z_OK) {
    if (this.options.to === 'string') {
      this.result = this.chunks.join('');
    } else {
      this.result = utils.flattenChunks(this.chunks);
    }
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};


/**
 * deflate(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to compress.
 * - options (Object): zlib deflate options.
 *
 * Compress `data` with deflate alrorythm and `options`.
 *
 * Supported options are:
 *
 * - level
 * - windowBits
 * - memLevel
 * - strategy
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information on these.
 *
 * Sugar (options):
 *
 * - `raw` (Boolean) - say that we work with raw stream, if you don't wish to specify
 *   negative windowBits implicitly.
 * - `to` (String) - if equal to 'string', then result will be "binary string"
 *    (each char code [0..255])
 *
 * ##### Example:
 *
 * ```javascript
 * var pako = require('pako')
 *   , data = Uint8Array([1,2,3,4,5,6,7,8,9]);
 *
 * console.log(pako.deflate(data));
 * ```
 **/
function deflate(input, options) {
  var deflator = new Deflate(options);

  deflator.push(input, true);

  // That will never happens, if you don't cheat with options :)
  if (deflator.err) { throw deflator.msg; }

  return deflator.result;
}


/**
 * deflateRaw(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to compress.
 * - options (Object): zlib deflate options.
 *
 * The same as [[deflate]], but creates raw data, without wrapper
 * (header and adler32 crc).
 **/
function deflateRaw(input, options) {
  options = options || {};
  options.raw = true;
  return deflate(input, options);
}


/**
 * gzip(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to compress.
 * - options (Object): zlib deflate options.
 *
 * The same as [[deflate]], but create gzip wrapper instead of
 * deflate one.
 **/
function gzip(input, options) {
  options = options || {};
  options.gzip = true;
  return deflate(input, options);
}


exports.Deflate = Deflate;
exports.deflate = deflate;
exports.deflateRaw = deflateRaw;
exports.gzip = gzip;

},{"./utils/common":30,"./utils/strings":31,"./zlib/deflate.js":35,"./zlib/messages":40,"./zlib/zstream":42}],29:[function(require,module,exports){
'use strict';


var zlib_inflate = require('./zlib/inflate.js');
var utils = require('./utils/common');
var strings = require('./utils/strings');
var c = require('./zlib/constants');
var msg = require('./zlib/messages');
var zstream = require('./zlib/zstream');
var gzheader = require('./zlib/gzheader');

var toString = Object.prototype.toString;

/**
 * class Inflate
 *
 * Generic JS-style wrapper for zlib calls. If you don't need
 * streaming behaviour - use more simple functions: [[inflate]]
 * and [[inflateRaw]].
 **/

/* internal
 * inflate.chunks -> Array
 *
 * Chunks of output data, if [[Inflate#onData]] not overriden.
 **/

/**
 * Inflate.result -> Uint8Array|Array|String
 *
 * Uncompressed result, generated by default [[Inflate#onData]]
 * and [[Inflate#onEnd]] handlers. Filled after you push last chunk
 * (call [[Inflate#push]] with `Z_FINISH` / `true` param) or if you
 * push a chunk with explicit flush (call [[Inflate#push]] with
 * `Z_SYNC_FLUSH` param).
 **/

/**
 * Inflate.err -> Number
 *
 * Error code after inflate finished. 0 (Z_OK) on success.
 * Should be checked if broken data possible.
 **/

/**
 * Inflate.msg -> String
 *
 * Error message, if [[Inflate.err]] != 0
 **/


/**
 * new Inflate(options)
 * - options (Object): zlib inflate options.
 *
 * Creates new inflator instance with specified params. Throws exception
 * on bad params. Supported options:
 *
 * - `windowBits`
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information on these.
 *
 * Additional options, for internal needs:
 *
 * - `chunkSize` - size of generated data chunks (16K by default)
 * - `raw` (Boolean) - do raw inflate
 * - `to` (String) - if equal to 'string', then result will be converted
 *   from utf8 to utf16 (javascript) string. When string output requested,
 *   chunk length can differ from `chunkSize`, depending on content.
 *
 * By default, when no options set, autodetect deflate/gzip data format via
 * wrapper header.
 *
 * ##### Example:
 *
 * ```javascript
 * var pako = require('pako')
 *   , chunk1 = Uint8Array([1,2,3,4,5,6,7,8,9])
 *   , chunk2 = Uint8Array([10,11,12,13,14,15,16,17,18,19]);
 *
 * var inflate = new pako.Inflate({ level: 3});
 *
 * inflate.push(chunk1, false);
 * inflate.push(chunk2, true);  // true -> last chunk
 *
 * if (inflate.err) { throw new Error(inflate.err); }
 *
 * console.log(inflate.result);
 * ```
 **/
var Inflate = function(options) {

  this.options = utils.assign({
    chunkSize: 16384,
    windowBits: 0,
    to: ''
  }, options || {});

  var opt = this.options;

  // Force window size for `raw` data, if not set directly,
  // because we have no header for autodetect.
  if (opt.raw && (opt.windowBits >= 0) && (opt.windowBits < 16)) {
    opt.windowBits = -opt.windowBits;
    if (opt.windowBits === 0) { opt.windowBits = -15; }
  }

  // If `windowBits` not defined (and mode not raw) - set autodetect flag for gzip/deflate
  if ((opt.windowBits >= 0) && (opt.windowBits < 16) &&
      !(options && options.windowBits)) {
    opt.windowBits += 32;
  }

  // Gzip header has no info about windows size, we can do autodetect only
  // for deflate. So, if window size not set, force it to max when gzip possible
  if ((opt.windowBits > 15) && (opt.windowBits < 48)) {
    // bit 3 (16) -> gzipped data
    // bit 4 (32) -> autodetect gzip/deflate
    if ((opt.windowBits & 15) === 0) {
      opt.windowBits |= 15;
    }
  }

  this.err    = 0;      // error code, if happens (0 = Z_OK)
  this.msg    = '';     // error message
  this.ended  = false;  // used to avoid multiple onEnd() calls
  this.chunks = [];     // chunks of compressed data

  this.strm   = new zstream();
  this.strm.avail_out = 0;

  var status  = zlib_inflate.inflateInit2(
    this.strm,
    opt.windowBits
  );

  if (status !== c.Z_OK) {
    throw new Error(msg[status]);
  }

  this.header = new gzheader();

  zlib_inflate.inflateGetHeader(this.strm, this.header);
};

/**
 * Inflate#push(data[, mode]) -> Boolean
 * - data (Uint8Array|Array|ArrayBuffer|String): input data
 * - mode (Number|Boolean): 0..6 for corresponding Z_NO_FLUSH..Z_TREE modes.
 *   See constants. Skipped or `false` means Z_NO_FLUSH, `true` meansh Z_FINISH.
 *
 * Sends input data to inflate pipe, generating [[Inflate#onData]] calls with
 * new output chunks. Returns `true` on success. The last data block must have
 * mode Z_FINISH (or `true`). That will flush internal pending buffers and call
 * [[Inflate#onEnd]]. For interim explicit flushes (without ending the stream) you
 * can use mode Z_SYNC_FLUSH, keeping the decompression context.
 *
 * On fail call [[Inflate#onEnd]] with error code and return false.
 *
 * We strongly recommend to use `Uint8Array` on input for best speed (output
 * format is detected automatically). Also, don't skip last param and always
 * use the same type in your code (boolean or number). That will improve JS speed.
 *
 * For regular `Array`-s make sure all elements are [0..255].
 *
 * ##### Example
 *
 * ```javascript
 * push(chunk, false); // push one of data chunks
 * ...
 * push(chunk, true);  // push last chunk
 * ```
 **/
Inflate.prototype.push = function(data, mode) {
  var strm = this.strm;
  var chunkSize = this.options.chunkSize;
  var status, _mode;
  var next_out_utf8, tail, utf8str;

  // Flag to properly process Z_BUF_ERROR on testing inflate call
  // when we check that all output data was flushed.
  var allowBufError = false;

  if (this.ended) { return false; }
  _mode = (mode === ~~mode) ? mode : ((mode === true) ? c.Z_FINISH : c.Z_NO_FLUSH);

  // Convert data if needed
  if (typeof data === 'string') {
    // Only binary strings can be decompressed on practice
    strm.input = strings.binstring2buf(data);
  } else if (toString.call(data) === '[object ArrayBuffer]') {
    strm.input = new Uint8Array(data);
  } else {
    strm.input = data;
  }

  strm.next_in = 0;
  strm.avail_in = strm.input.length;

  do {
    if (strm.avail_out === 0) {
      strm.output = new utils.Buf8(chunkSize);
      strm.next_out = 0;
      strm.avail_out = chunkSize;
    }

    status = zlib_inflate.inflate(strm, c.Z_NO_FLUSH);    /* no bad return value */

    if (status === c.Z_BUF_ERROR && allowBufError === true) {
      status = c.Z_OK;
      allowBufError = false;
    }

    if (status !== c.Z_STREAM_END && status !== c.Z_OK) {
      this.onEnd(status);
      this.ended = true;
      return false;
    }

    if (strm.next_out) {
      if (strm.avail_out === 0 || status === c.Z_STREAM_END || (strm.avail_in === 0 && (_mode === c.Z_FINISH || _mode === c.Z_SYNC_FLUSH))) {

        if (this.options.to === 'string') {

          next_out_utf8 = strings.utf8border(strm.output, strm.next_out);

          tail = strm.next_out - next_out_utf8;
          utf8str = strings.buf2string(strm.output, next_out_utf8);

          // move tail
          strm.next_out = tail;
          strm.avail_out = chunkSize - tail;
          if (tail) { utils.arraySet(strm.output, strm.output, next_out_utf8, tail, 0); }

          this.onData(utf8str);

        } else {
          this.onData(utils.shrinkBuf(strm.output, strm.next_out));
        }
      }
    }

    // When no more input data, we should check that internal inflate buffers
    // are flushed. The only way to do it when avail_out = 0 - run one more
    // inflate pass. But if output data not exists, inflate return Z_BUF_ERROR.
    // Here we set flag to process this error properly.
    //
    // NOTE. Deflate does not return error in this case and does not needs such
    // logic.
    if (strm.avail_in === 0 && strm.avail_out === 0) {
      allowBufError = true;
    }

  } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== c.Z_STREAM_END);

  if (status === c.Z_STREAM_END) {
    _mode = c.Z_FINISH;
  }

  // Finalize on the last chunk.
  if (_mode === c.Z_FINISH) {
    status = zlib_inflate.inflateEnd(this.strm);
    this.onEnd(status);
    this.ended = true;
    return status === c.Z_OK;
  }

  // callback interim results if Z_SYNC_FLUSH.
  if (_mode === c.Z_SYNC_FLUSH) {
    this.onEnd(c.Z_OK);
    strm.avail_out = 0;
    return true;
  }

  return true;
};


/**
 * Inflate#onData(chunk) -> Void
 * - chunk (Uint8Array|Array|String): ouput data. Type of array depends
 *   on js engine support. When string output requested, each chunk
 *   will be string.
 *
 * By default, stores data blocks in `chunks[]` property and glue
 * those in `onEnd`. Override this handler, if you need another behaviour.
 **/
Inflate.prototype.onData = function(chunk) {
  this.chunks.push(chunk);
};


/**
 * Inflate#onEnd(status) -> Void
 * - status (Number): inflate status. 0 (Z_OK) on success,
 *   other if not.
 *
 * Called either after you tell inflate that the input stream is
 * complete (Z_FINISH) or should be flushed (Z_SYNC_FLUSH)
 * or if an error happened. By default - join collected chunks,
 * free memory and fill `results` / `err` properties.
 **/
Inflate.prototype.onEnd = function(status) {
  // On success - join
  if (status === c.Z_OK) {
    if (this.options.to === 'string') {
      // Glue & convert here, until we teach pako to send
      // utf8 alligned strings to onData
      this.result = this.chunks.join('');
    } else {
      this.result = utils.flattenChunks(this.chunks);
    }
  }
  this.chunks = [];
  this.err = status;
  this.msg = this.strm.msg;
};


/**
 * inflate(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * Decompress `data` with inflate/ungzip and `options`. Autodetect
 * format via wrapper header by default. That's why we don't provide
 * separate `ungzip` method.
 *
 * Supported options are:
 *
 * - windowBits
 *
 * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
 * for more information.
 *
 * Sugar (options):
 *
 * - `raw` (Boolean) - say that we work with raw stream, if you don't wish to specify
 *   negative windowBits implicitly.
 * - `to` (String) - if equal to 'string', then result will be converted
 *   from utf8 to utf16 (javascript) string. When string output requested,
 *   chunk length can differ from `chunkSize`, depending on content.
 *
 *
 * ##### Example:
 *
 * ```javascript
 * var pako = require('pako')
 *   , input = pako.deflate([1,2,3,4,5,6,7,8,9])
 *   , output;
 *
 * try {
 *   output = pako.inflate(input);
 * } catch (err)
 *   console.log(err);
 * }
 * ```
 **/
function inflate(input, options) {
  var inflator = new Inflate(options);

  inflator.push(input, true);

  // That will never happens, if you don't cheat with options :)
  if (inflator.err) { throw inflator.msg; }

  return inflator.result;
}


/**
 * inflateRaw(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * The same as [[inflate]], but creates raw data, without wrapper
 * (header and adler32 crc).
 **/
function inflateRaw(input, options) {
  options = options || {};
  options.raw = true;
  return inflate(input, options);
}


/**
 * ungzip(data[, options]) -> Uint8Array|Array|String
 * - data (Uint8Array|Array|String): input data to decompress.
 * - options (Object): zlib inflate options.
 *
 * Just shortcut to [[inflate]], because it autodetects format
 * by header.content. Done for convenience.
 **/


exports.Inflate = Inflate;
exports.inflate = inflate;
exports.inflateRaw = inflateRaw;
exports.ungzip  = inflate;

},{"./utils/common":30,"./utils/strings":31,"./zlib/constants":33,"./zlib/gzheader":36,"./zlib/inflate.js":38,"./zlib/messages":40,"./zlib/zstream":42}],30:[function(require,module,exports){
'use strict';


var TYPED_OK =  (typeof Uint8Array !== 'undefined') &&
                (typeof Uint16Array !== 'undefined') &&
                (typeof Int32Array !== 'undefined');


exports.assign = function (obj /*from1, from2, from3, ...*/) {
  var sources = Array.prototype.slice.call(arguments, 1);
  while (sources.length) {
    var source = sources.shift();
    if (!source) { continue; }

    if (typeof source !== 'object') {
      throw new TypeError(source + 'must be non-object');
    }

    for (var p in source) {
      if (source.hasOwnProperty(p)) {
        obj[p] = source[p];
      }
    }
  }

  return obj;
};


// reduce buffer size, avoiding mem copy
exports.shrinkBuf = function (buf, size) {
  if (buf.length === size) { return buf; }
  if (buf.subarray) { return buf.subarray(0, size); }
  buf.length = size;
  return buf;
};


var fnTyped = {
  arraySet: function (dest, src, src_offs, len, dest_offs) {
    if (src.subarray && dest.subarray) {
      dest.set(src.subarray(src_offs, src_offs+len), dest_offs);
      return;
    }
    // Fallback to ordinary array
    for (var i=0; i<len; i++) {
      dest[dest_offs + i] = src[src_offs + i];
    }
  },
  // Join array of chunks to single array.
  flattenChunks: function(chunks) {
    var i, l, len, pos, chunk, result;

    // calculate data length
    len = 0;
    for (i=0, l=chunks.length; i<l; i++) {
      len += chunks[i].length;
    }

    // join chunks
    result = new Uint8Array(len);
    pos = 0;
    for (i=0, l=chunks.length; i<l; i++) {
      chunk = chunks[i];
      result.set(chunk, pos);
      pos += chunk.length;
    }

    return result;
  }
};

var fnUntyped = {
  arraySet: function (dest, src, src_offs, len, dest_offs) {
    for (var i=0; i<len; i++) {
      dest[dest_offs + i] = src[src_offs + i];
    }
  },
  // Join array of chunks to single array.
  flattenChunks: function(chunks) {
    return [].concat.apply([], chunks);
  }
};


// Enable/Disable typed arrays use, for testing
//
exports.setTyped = function (on) {
  if (on) {
    exports.Buf8  = Uint8Array;
    exports.Buf16 = Uint16Array;
    exports.Buf32 = Int32Array;
    exports.assign(exports, fnTyped);
  } else {
    exports.Buf8  = Array;
    exports.Buf16 = Array;
    exports.Buf32 = Array;
    exports.assign(exports, fnUntyped);
  }
};

exports.setTyped(TYPED_OK);

},{}],31:[function(require,module,exports){
// String encode/decode helpers
'use strict';


var utils = require('./common');


// Quick check if we can use fast array to bin string conversion
//
// - apply(Array) can fail on Android 2.2
// - apply(Uint8Array) can fail on iOS 5.1 Safary
//
var STR_APPLY_OK = true;
var STR_APPLY_UIA_OK = true;

try { String.fromCharCode.apply(null, [0]); } catch(__) { STR_APPLY_OK = false; }
try { String.fromCharCode.apply(null, new Uint8Array(1)); } catch(__) { STR_APPLY_UIA_OK = false; }


// Table with utf8 lengths (calculated by first byte of sequence)
// Note, that 5 & 6-byte values and some 4-byte values can not be represented in JS,
// because max possible codepoint is 0x10ffff
var _utf8len = new utils.Buf8(256);
for (var q=0; q<256; q++) {
  _utf8len[q] = (q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1);
}
_utf8len[254]=_utf8len[254]=1; // Invalid sequence start


// convert string to array (typed, when possible)
exports.string2buf = function (str) {
  var buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;

  // count binary size
  for (m_pos = 0; m_pos < str_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 0xfc00) === 0xd800 && (m_pos+1 < str_len)) {
      c2 = str.charCodeAt(m_pos+1);
      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        m_pos++;
      }
    }
    buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }

  // allocate buffer
  buf = new utils.Buf8(buf_len);

  // convert
  for (i=0, m_pos = 0; i < buf_len; m_pos++) {
    c = str.charCodeAt(m_pos);
    if ((c & 0xfc00) === 0xd800 && (m_pos+1 < str_len)) {
      c2 = str.charCodeAt(m_pos+1);
      if ((c2 & 0xfc00) === 0xdc00) {
        c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        m_pos++;
      }
    }
    if (c < 0x80) {
      /* one byte */
      buf[i++] = c;
    } else if (c < 0x800) {
      /* two bytes */
      buf[i++] = 0xC0 | (c >>> 6);
      buf[i++] = 0x80 | (c & 0x3f);
    } else if (c < 0x10000) {
      /* three bytes */
      buf[i++] = 0xE0 | (c >>> 12);
      buf[i++] = 0x80 | (c >>> 6 & 0x3f);
      buf[i++] = 0x80 | (c & 0x3f);
    } else {
      /* four bytes */
      buf[i++] = 0xf0 | (c >>> 18);
      buf[i++] = 0x80 | (c >>> 12 & 0x3f);
      buf[i++] = 0x80 | (c >>> 6 & 0x3f);
      buf[i++] = 0x80 | (c & 0x3f);
    }
  }

  return buf;
};

// Helper (used in 2 places)
function buf2binstring(buf, len) {
  // use fallback for big arrays to avoid stack overflow
  if (len < 65537) {
    if ((buf.subarray && STR_APPLY_UIA_OK) || (!buf.subarray && STR_APPLY_OK)) {
      return String.fromCharCode.apply(null, utils.shrinkBuf(buf, len));
    }
  }

  var result = '';
  for (var i=0; i < len; i++) {
    result += String.fromCharCode(buf[i]);
  }
  return result;
}


// Convert byte array to binary string
exports.buf2binstring = function(buf) {
  return buf2binstring(buf, buf.length);
};


// Convert binary string (typed, when possible)
exports.binstring2buf = function(str) {
  var buf = new utils.Buf8(str.length);
  for (var i=0, len=buf.length; i < len; i++) {
    buf[i] = str.charCodeAt(i);
  }
  return buf;
};


// convert array to string
exports.buf2string = function (buf, max) {
  var i, out, c, c_len;
  var len = max || buf.length;

  // Reserve max possible length (2 words per char)
  // NB: by unknown reasons, Array is significantly faster for
  //     String.fromCharCode.apply than Uint16Array.
  var utf16buf = new Array(len*2);

  for (out=0, i=0; i<len;) {
    c = buf[i++];
    // quick process ascii
    if (c < 0x80) { utf16buf[out++] = c; continue; }

    c_len = _utf8len[c];
    // skip 5 & 6 byte codes
    if (c_len > 4) { utf16buf[out++] = 0xfffd; i += c_len-1; continue; }

    // apply mask on first byte
    c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07;
    // join the rest
    while (c_len > 1 && i < len) {
      c = (c << 6) | (buf[i++] & 0x3f);
      c_len--;
    }

    // terminated by end of string?
    if (c_len > 1) { utf16buf[out++] = 0xfffd; continue; }

    if (c < 0x10000) {
      utf16buf[out++] = c;
    } else {
      c -= 0x10000;
      utf16buf[out++] = 0xd800 | ((c >> 10) & 0x3ff);
      utf16buf[out++] = 0xdc00 | (c & 0x3ff);
    }
  }

  return buf2binstring(utf16buf, out);
};


// Calculate max possible position in utf8 buffer,
// that will not break sequence. If that's not possible
// - (very small limits) return max size as is.
//
// buf[] - utf8 bytes array
// max   - length limit (mandatory);
exports.utf8border = function(buf, max) {
  var pos;

  max = max || buf.length;
  if (max > buf.length) { max = buf.length; }

  // go back from last position, until start of sequence found
  pos = max-1;
  while (pos >= 0 && (buf[pos] & 0xC0) === 0x80) { pos--; }

  // Fuckup - very small and broken sequence,
  // return max, because we should return something anyway.
  if (pos < 0) { return max; }

  // If we came to start of buffer - that means vuffer is too small,
  // return max too.
  if (pos === 0) { return max; }

  return (pos + _utf8len[buf[pos]] > max) ? pos : max;
};

},{"./common":30}],32:[function(require,module,exports){
'use strict';

// Note: adler32 takes 12% for level 0 and 2% for level 6.
// It doesn't worth to make additional optimizationa as in original.
// Small size is preferable.

function adler32(adler, buf, len, pos) {
  var s1 = (adler & 0xffff) |0,
      s2 = ((adler >>> 16) & 0xffff) |0,
      n = 0;

  while (len !== 0) {
    // Set limit ~ twice less than 5552, to keep
    // s2 in 31-bits, because we force signed ints.
    // in other case %= will fail.
    n = len > 2000 ? 2000 : len;
    len -= n;

    do {
      s1 = (s1 + buf[pos++]) |0;
      s2 = (s2 + s1) |0;
    } while (--n);

    s1 %= 65521;
    s2 %= 65521;
  }

  return (s1 | (s2 << 16)) |0;
}


module.exports = adler32;

},{}],33:[function(require,module,exports){
module.exports = {

  /* Allowed flush values; see deflate() and inflate() below for details */
  Z_NO_FLUSH:         0,
  Z_PARTIAL_FLUSH:    1,
  Z_SYNC_FLUSH:       2,
  Z_FULL_FLUSH:       3,
  Z_FINISH:           4,
  Z_BLOCK:            5,
  Z_TREES:            6,

  /* Return codes for the compression/decompression functions. Negative values
  * are errors, positive values are used for special but normal events.
  */
  Z_OK:               0,
  Z_STREAM_END:       1,
  Z_NEED_DICT:        2,
  Z_ERRNO:           -1,
  Z_STREAM_ERROR:    -2,
  Z_DATA_ERROR:      -3,
  //Z_MEM_ERROR:     -4,
  Z_BUF_ERROR:       -5,
  //Z_VERSION_ERROR: -6,

  /* compression levels */
  Z_NO_COMPRESSION:         0,
  Z_BEST_SPEED:             1,
  Z_BEST_COMPRESSION:       9,
  Z_DEFAULT_COMPRESSION:   -1,


  Z_FILTERED:               1,
  Z_HUFFMAN_ONLY:           2,
  Z_RLE:                    3,
  Z_FIXED:                  4,
  Z_DEFAULT_STRATEGY:       0,

  /* Possible values of the data_type field (though see inflate()) */
  Z_BINARY:                 0,
  Z_TEXT:                   1,
  //Z_ASCII:                1, // = Z_TEXT (deprecated)
  Z_UNKNOWN:                2,

  /* The deflate compression method */
  Z_DEFLATED:               8
  //Z_NULL:                 null // Use -1 or null inline, depending on var type
};

},{}],34:[function(require,module,exports){
'use strict';

// Note: we can't get significant speed boost here.
// So write code to minimize size - no pregenerated tables
// and array tools dependencies.


// Use ordinary array, since untyped makes no boost here
function makeTable() {
  var c, table = [];

  for (var n =0; n < 256; n++) {
    c = n;
    for (var k =0; k < 8; k++) {
      c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }

  return table;
}

// Create table on load. Just 255 signed longs. Not a problem.
var crcTable = makeTable();


function crc32(crc, buf, len, pos) {
  var t = crcTable,
      end = pos + len;

  crc = crc ^ (-1);

  for (var i = pos; i < end; i++) {
    crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
  }

  return (crc ^ (-1)); // >>> 0;
}


module.exports = crc32;

},{}],35:[function(require,module,exports){
'use strict';

var utils   = require('../utils/common');
var trees   = require('./trees');
var adler32 = require('./adler32');
var crc32   = require('./crc32');
var msg   = require('./messages');

/* Public constants ==========================================================*/
/* ===========================================================================*/


/* Allowed flush values; see deflate() and inflate() below for details */
var Z_NO_FLUSH      = 0;
var Z_PARTIAL_FLUSH = 1;
//var Z_SYNC_FLUSH    = 2;
var Z_FULL_FLUSH    = 3;
var Z_FINISH        = 4;
var Z_BLOCK         = 5;
//var Z_TREES         = 6;


/* Return codes for the compression/decompression functions. Negative values
 * are errors, positive values are used for special but normal events.
 */
var Z_OK            = 0;
var Z_STREAM_END    = 1;
//var Z_NEED_DICT     = 2;
//var Z_ERRNO         = -1;
var Z_STREAM_ERROR  = -2;
var Z_DATA_ERROR    = -3;
//var Z_MEM_ERROR     = -4;
var Z_BUF_ERROR     = -5;
//var Z_VERSION_ERROR = -6;


/* compression levels */
//var Z_NO_COMPRESSION      = 0;
//var Z_BEST_SPEED          = 1;
//var Z_BEST_COMPRESSION    = 9;
var Z_DEFAULT_COMPRESSION = -1;


var Z_FILTERED            = 1;
var Z_HUFFMAN_ONLY        = 2;
var Z_RLE                 = 3;
var Z_FIXED               = 4;
var Z_DEFAULT_STRATEGY    = 0;

/* Possible values of the data_type field (though see inflate()) */
//var Z_BINARY              = 0;
//var Z_TEXT                = 1;
//var Z_ASCII               = 1; // = Z_TEXT
var Z_UNKNOWN             = 2;


/* The deflate compression method */
var Z_DEFLATED  = 8;

/*============================================================================*/


var MAX_MEM_LEVEL = 9;
/* Maximum value for memLevel in deflateInit2 */
var MAX_WBITS = 15;
/* 32K LZ77 window */
var DEF_MEM_LEVEL = 8;


var LENGTH_CODES  = 29;
/* number of length codes, not counting the special END_BLOCK code */
var LITERALS      = 256;
/* number of literal bytes 0..255 */
var L_CODES       = LITERALS + 1 + LENGTH_CODES;
/* number of Literal or Length codes, including the END_BLOCK code */
var D_CODES       = 30;
/* number of distance codes */
var BL_CODES      = 19;
/* number of codes used to transfer the bit lengths */
var HEAP_SIZE     = 2*L_CODES + 1;
/* maximum heap size */
var MAX_BITS  = 15;
/* All codes must not exceed MAX_BITS bits */

var MIN_MATCH = 3;
var MAX_MATCH = 258;
var MIN_LOOKAHEAD = (MAX_MATCH + MIN_MATCH + 1);

var PRESET_DICT = 0x20;

var INIT_STATE = 42;
var EXTRA_STATE = 69;
var NAME_STATE = 73;
var COMMENT_STATE = 91;
var HCRC_STATE = 103;
var BUSY_STATE = 113;
var FINISH_STATE = 666;

var BS_NEED_MORE      = 1; /* block not completed, need more input or more output */
var BS_BLOCK_DONE     = 2; /* block flush performed */
var BS_FINISH_STARTED = 3; /* finish started, need only more output at next deflate */
var BS_FINISH_DONE    = 4; /* finish done, accept no more input or output */

var OS_CODE = 0x03; // Unix :) . Don't detect, use this default.

function err(strm, errorCode) {
  strm.msg = msg[errorCode];
  return errorCode;
}

function rank(f) {
  return ((f) << 1) - ((f) > 4 ? 9 : 0);
}

function zero(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0; } }


/* =========================================================================
 * Flush as much pending output as possible. All deflate() output goes
 * through this function so some applications may wish to modify it
 * to avoid allocating a large strm->output buffer and copying into it.
 * (See also read_buf()).
 */
function flush_pending(strm) {
  var s = strm.state;

  //_tr_flush_bits(s);
  var len = s.pending;
  if (len > strm.avail_out) {
    len = strm.avail_out;
  }
  if (len === 0) { return; }

  utils.arraySet(strm.output, s.pending_buf, s.pending_out, len, strm.next_out);
  strm.next_out += len;
  s.pending_out += len;
  strm.total_out += len;
  strm.avail_out -= len;
  s.pending -= len;
  if (s.pending === 0) {
    s.pending_out = 0;
  }
}


function flush_block_only (s, last) {
  trees._tr_flush_block(s, (s.block_start >= 0 ? s.block_start : -1), s.strstart - s.block_start, last);
  s.block_start = s.strstart;
  flush_pending(s.strm);
}


function put_byte(s, b) {
  s.pending_buf[s.pending++] = b;
}


/* =========================================================================
 * Put a short in the pending buffer. The 16-bit value is put in MSB order.
 * IN assertion: the stream state is correct and there is enough room in
 * pending_buf.
 */
function putShortMSB(s, b) {
//  put_byte(s, (Byte)(b >> 8));
//  put_byte(s, (Byte)(b & 0xff));
  s.pending_buf[s.pending++] = (b >>> 8) & 0xff;
  s.pending_buf[s.pending++] = b & 0xff;
}


/* ===========================================================================
 * Read a new buffer from the current input stream, update the adler32
 * and total number of bytes read.  All deflate() input goes through
 * this function so some applications may wish to modify it to avoid
 * allocating a large strm->input buffer and copying from it.
 * (See also flush_pending()).
 */
function read_buf(strm, buf, start, size) {
  var len = strm.avail_in;

  if (len > size) { len = size; }
  if (len === 0) { return 0; }

  strm.avail_in -= len;

  utils.arraySet(buf, strm.input, strm.next_in, len, start);
  if (strm.state.wrap === 1) {
    strm.adler = adler32(strm.adler, buf, len, start);
  }

  else if (strm.state.wrap === 2) {
    strm.adler = crc32(strm.adler, buf, len, start);
  }

  strm.next_in += len;
  strm.total_in += len;

  return len;
}


/* ===========================================================================
 * Set match_start to the longest match starting at the given string and
 * return its length. Matches shorter or equal to prev_length are discarded,
 * in which case the result is equal to prev_length and match_start is
 * garbage.
 * IN assertions: cur_match is the head of the hash chain for the current
 *   string (strstart) and its distance is <= MAX_DIST, and prev_length >= 1
 * OUT assertion: the match length is not greater than s->lookahead.
 */
function longest_match(s, cur_match) {
  var chain_length = s.max_chain_length;      /* max hash chain length */
  var scan = s.strstart; /* current string */
  var match;                       /* matched string */
  var len;                           /* length of current match */
  var best_len = s.prev_length;              /* best match length so far */
  var nice_match = s.nice_match;             /* stop if match long enough */
  var limit = (s.strstart > (s.w_size - MIN_LOOKAHEAD)) ?
      s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0/*NIL*/;

  var _win = s.window; // shortcut

  var wmask = s.w_mask;
  var prev  = s.prev;

  /* Stop when cur_match becomes <= limit. To simplify the code,
   * we prevent matches with the string of window index 0.
   */

  var strend = s.strstart + MAX_MATCH;
  var scan_end1  = _win[scan + best_len - 1];
  var scan_end   = _win[scan + best_len];

  /* The code is optimized for HASH_BITS >= 8 and MAX_MATCH-2 multiple of 16.
   * It is easy to get rid of this optimization if necessary.
   */
  // Assert(s->hash_bits >= 8 && MAX_MATCH == 258, "Code too clever");

  /* Do not waste too much time if we already have a good match: */
  if (s.prev_length >= s.good_match) {
    chain_length >>= 2;
  }
  /* Do not look for matches beyond the end of the input. This is necessary
   * to make deflate deterministic.
   */
  if (nice_match > s.lookahead) { nice_match = s.lookahead; }

  // Assert((ulg)s->strstart <= s->window_size-MIN_LOOKAHEAD, "need lookahead");

  do {
    // Assert(cur_match < s->strstart, "no future");
    match = cur_match;

    /* Skip to next match if the match length cannot increase
     * or if the match length is less than 2.  Note that the checks below
     * for insufficient lookahead only occur occasionally for performance
     * reasons.  Therefore uninitialized memory will be accessed, and
     * conditional jumps will be made that depend on those values.
     * However the length of the match is limited to the lookahead, so
     * the output of deflate is not affected by the uninitialized values.
     */

    if (_win[match + best_len]     !== scan_end  ||
        _win[match + best_len - 1] !== scan_end1 ||
        _win[match]                !== _win[scan] ||
        _win[++match]              !== _win[scan + 1]) {
      continue;
    }

    /* The check at best_len-1 can be removed because it will be made
     * again later. (This heuristic is not always a win.)
     * It is not necessary to compare scan[2] and match[2] since they
     * are always equal when the other bytes match, given that
     * the hash keys are equal and that HASH_BITS >= 8.
     */
    scan += 2;
    match++;
    // Assert(*scan == *match, "match[2]?");

    /* We check for insufficient lookahead only every 8th comparison;
     * the 256th check will be made at strstart+258.
     */
    do {
      /*jshint noempty:false*/
    } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
             scan < strend);

    // Assert(scan <= s->window+(unsigned)(s->window_size-1), "wild scan");

    len = MAX_MATCH - (strend - scan);
    scan = strend - MAX_MATCH;

    if (len > best_len) {
      s.match_start = cur_match;
      best_len = len;
      if (len >= nice_match) {
        break;
      }
      scan_end1  = _win[scan + best_len - 1];
      scan_end   = _win[scan + best_len];
    }
  } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);

  if (best_len <= s.lookahead) {
    return best_len;
  }
  return s.lookahead;
}


/* ===========================================================================
 * Fill the window when the lookahead becomes insufficient.
 * Updates strstart and lookahead.
 *
 * IN assertion: lookahead < MIN_LOOKAHEAD
 * OUT assertions: strstart <= window_size-MIN_LOOKAHEAD
 *    At least one byte has been read, or avail_in == 0; reads are
 *    performed for at least two bytes (required for the zip translate_eol
 *    option -- not supported here).
 */
function fill_window(s) {
  var _w_size = s.w_size;
  var p, n, m, more, str;

  //Assert(s->lookahead < MIN_LOOKAHEAD, "already enough lookahead");

  do {
    more = s.window_size - s.lookahead - s.strstart;

    // JS ints have 32 bit, block below not needed
    /* Deal with !@#$% 64K limit: */
    //if (sizeof(int) <= 2) {
    //    if (more == 0 && s->strstart == 0 && s->lookahead == 0) {
    //        more = wsize;
    //
    //  } else if (more == (unsigned)(-1)) {
    //        /* Very unlikely, but possible on 16 bit machine if
    //         * strstart == 0 && lookahead == 1 (input done a byte at time)
    //         */
    //        more--;
    //    }
    //}


    /* If the window is almost full and there is insufficient lookahead,
     * move the upper half to the lower one to make room in the upper half.
     */
    if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {

      utils.arraySet(s.window, s.window, _w_size, _w_size, 0);
      s.match_start -= _w_size;
      s.strstart -= _w_size;
      /* we now have strstart >= MAX_DIST */
      s.block_start -= _w_size;

      /* Slide the hash table (could be avoided with 32 bit values
       at the expense of memory usage). We slide even when level == 0
       to keep the hash table consistent if we switch back to level > 0
       later. (Using level 0 permanently is not an optimal usage of
       zlib, so we don't care about this pathological case.)
       */

      n = s.hash_size;
      p = n;
      do {
        m = s.head[--p];
        s.head[p] = (m >= _w_size ? m - _w_size : 0);
      } while (--n);

      n = _w_size;
      p = n;
      do {
        m = s.prev[--p];
        s.prev[p] = (m >= _w_size ? m - _w_size : 0);
        /* If n is not on any hash chain, prev[n] is garbage but
         * its value will never be used.
         */
      } while (--n);

      more += _w_size;
    }
    if (s.strm.avail_in === 0) {
      break;
    }

    /* If there was no sliding:
     *    strstart <= WSIZE+MAX_DIST-1 && lookahead <= MIN_LOOKAHEAD - 1 &&
     *    more == window_size - lookahead - strstart
     * => more >= window_size - (MIN_LOOKAHEAD-1 + WSIZE + MAX_DIST-1)
     * => more >= window_size - 2*WSIZE + 2
     * In the BIG_MEM or MMAP case (not yet supported),
     *   window_size == input_size + MIN_LOOKAHEAD  &&
     *   strstart + s->lookahead <= input_size => more >= MIN_LOOKAHEAD.
     * Otherwise, window_size == 2*WSIZE so more >= 2.
     * If there was sliding, more >= WSIZE. So in all cases, more >= 2.
     */
    //Assert(more >= 2, "more < 2");
    n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
    s.lookahead += n;

    /* Initialize the hash value now that we have some input: */
    if (s.lookahead + s.insert >= MIN_MATCH) {
      str = s.strstart - s.insert;
      s.ins_h = s.window[str];

      /* UPDATE_HASH(s, s->ins_h, s->window[str + 1]); */
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + 1]) & s.hash_mask;
//#if MIN_MATCH != 3
//        Call update_hash() MIN_MATCH-3 more times
//#endif
      while (s.insert) {
        /* UPDATE_HASH(s, s->ins_h, s->window[str + MIN_MATCH-1]); */
        s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + MIN_MATCH-1]) & s.hash_mask;

        s.prev[str & s.w_mask] = s.head[s.ins_h];
        s.head[s.ins_h] = str;
        str++;
        s.insert--;
        if (s.lookahead + s.insert < MIN_MATCH) {
          break;
        }
      }
    }
    /* If the whole input has less than MIN_MATCH bytes, ins_h is garbage,
     * but this is not important since only literal bytes will be emitted.
     */

  } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);

  /* If the WIN_INIT bytes after the end of the current data have never been
   * written, then zero those bytes in order to avoid memory check reports of
   * the use of uninitialized (or uninitialised as Julian writes) bytes by
   * the longest match routines.  Update the high water mark for the next
   * time through here.  WIN_INIT is set to MAX_MATCH since the longest match
   * routines allow scanning to strstart + MAX_MATCH, ignoring lookahead.
   */
//  if (s.high_water < s.window_size) {
//    var curr = s.strstart + s.lookahead;
//    var init = 0;
//
//    if (s.high_water < curr) {
//      /* Previous high water mark below current data -- zero WIN_INIT
//       * bytes or up to end of window, whichever is less.
//       */
//      init = s.window_size - curr;
//      if (init > WIN_INIT)
//        init = WIN_INIT;
//      zmemzero(s->window + curr, (unsigned)init);
//      s->high_water = curr + init;
//    }
//    else if (s->high_water < (ulg)curr + WIN_INIT) {
//      /* High water mark at or above current data, but below current data
//       * plus WIN_INIT -- zero out to current data plus WIN_INIT, or up
//       * to end of window, whichever is less.
//       */
//      init = (ulg)curr + WIN_INIT - s->high_water;
//      if (init > s->window_size - s->high_water)
//        init = s->window_size - s->high_water;
//      zmemzero(s->window + s->high_water, (unsigned)init);
//      s->high_water += init;
//    }
//  }
//
//  Assert((ulg)s->strstart <= s->window_size - MIN_LOOKAHEAD,
//    "not enough room for search");
}

/* ===========================================================================
 * Copy without compression as much as possible from the input stream, return
 * the current block state.
 * This function does not insert new strings in the dictionary since
 * uncompressible data is probably not useful. This function is used
 * only for the level=0 compression option.
 * NOTE: this function should be optimized to avoid extra copying from
 * window to pending_buf.
 */
function deflate_stored(s, flush) {
  /* Stored blocks are limited to 0xffff bytes, pending_buf is limited
   * to pending_buf_size, and each stored block has a 5 byte header:
   */
  var max_block_size = 0xffff;

  if (max_block_size > s.pending_buf_size - 5) {
    max_block_size = s.pending_buf_size - 5;
  }

  /* Copy as much as possible from input to output: */
  for (;;) {
    /* Fill the window as much as possible: */
    if (s.lookahead <= 1) {

      //Assert(s->strstart < s->w_size+MAX_DIST(s) ||
      //  s->block_start >= (long)s->w_size, "slide too late");
//      if (!(s.strstart < s.w_size + (s.w_size - MIN_LOOKAHEAD) ||
//        s.block_start >= s.w_size)) {
//        throw  new Error("slide too late");
//      }

      fill_window(s);
      if (s.lookahead === 0 && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }

      if (s.lookahead === 0) {
        break;
      }
      /* flush the current block */
    }
    //Assert(s->block_start >= 0L, "block gone");
//    if (s.block_start < 0) throw new Error("block gone");

    s.strstart += s.lookahead;
    s.lookahead = 0;

    /* Emit a stored block if pending_buf will be full: */
    var max_start = s.block_start + max_block_size;

    if (s.strstart === 0 || s.strstart >= max_start) {
      /* strstart == 0 is possible when wraparound on 16-bit machine */
      s.lookahead = s.strstart - max_start;
      s.strstart = max_start;
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/


    }
    /* Flush if we may have to slide, otherwise block_start may become
     * negative and the data will be gone:
     */
    if (s.strstart - s.block_start >= (s.w_size - MIN_LOOKAHEAD)) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }

  s.insert = 0;

  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }

  if (s.strstart > s.block_start) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }

  return BS_NEED_MORE;
}

/* ===========================================================================
 * Compress as much as possible from the input stream, return the current
 * block state.
 * This function does not perform lazy evaluation of matches and inserts
 * new strings in the dictionary only for unmatched strings or for short
 * matches. It is used only for the fast compression options.
 */
function deflate_fast(s, flush) {
  var hash_head;        /* head of the hash chain */
  var bflush;           /* set if current block must be flushed */

  for (;;) {
    /* Make sure that we always have enough lookahead, except
     * at the end of the input file. We need MAX_MATCH bytes
     * for the next match, plus MIN_MATCH bytes to insert the
     * string following the next match.
     */
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) {
        break; /* flush the current block */
      }
    }

    /* Insert the string window[strstart .. strstart+2] in the
     * dictionary, and set hash_head to the head of the hash chain:
     */
    hash_head = 0/*NIL*/;
    if (s.lookahead >= MIN_MATCH) {
      /*** INSERT_STRING(s, s.strstart, hash_head); ***/
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
      /***/
    }

    /* Find the longest match, discarding those <= prev_length.
     * At this point we have always match_length < MIN_MATCH
     */
    if (hash_head !== 0/*NIL*/ && ((s.strstart - hash_head) <= (s.w_size - MIN_LOOKAHEAD))) {
      /* To simplify the code, we prevent matches with the string
       * of window index 0 (in particular we have to avoid a match
       * of the string with itself at the start of the input file).
       */
      s.match_length = longest_match(s, hash_head);
      /* longest_match() sets match_start */
    }
    if (s.match_length >= MIN_MATCH) {
      // check_match(s, s.strstart, s.match_start, s.match_length); // for debug only

      /*** _tr_tally_dist(s, s.strstart - s.match_start,
                     s.match_length - MIN_MATCH, bflush); ***/
      bflush = trees._tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH);

      s.lookahead -= s.match_length;

      /* Insert new strings in the hash table only if the match length
       * is not too large. This saves time but degrades compression.
       */
      if (s.match_length <= s.max_lazy_match/*max_insert_length*/ && s.lookahead >= MIN_MATCH) {
        s.match_length--; /* string at strstart already in table */
        do {
          s.strstart++;
          /*** INSERT_STRING(s, s.strstart, hash_head); ***/
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          /***/
          /* strstart never exceeds WSIZE-MAX_MATCH, so there are
           * always MIN_MATCH bytes ahead.
           */
        } while (--s.match_length !== 0);
        s.strstart++;
      } else
      {
        s.strstart += s.match_length;
        s.match_length = 0;
        s.ins_h = s.window[s.strstart];
        /* UPDATE_HASH(s, s.ins_h, s.window[s.strstart+1]); */
        s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + 1]) & s.hash_mask;

//#if MIN_MATCH != 3
//                Call UPDATE_HASH() MIN_MATCH-3 more times
//#endif
        /* If lookahead < MIN_MATCH, ins_h is garbage, but it does not
         * matter since it will be recomputed at next deflate call.
         */
      }
    } else {
      /* No match, output a literal byte */
      //Tracevv((stderr,"%c", s.window[s.strstart]));
      /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
      bflush = trees._tr_tally(s, 0, s.window[s.strstart]);

      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }
  s.insert = ((s.strstart < (MIN_MATCH-1)) ? s.strstart : MIN_MATCH-1);
  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }
  return BS_BLOCK_DONE;
}

/* ===========================================================================
 * Same as above, but achieves better compression. We use a lazy
 * evaluation for matches: a match is finally adopted only if there is
 * no better match at the next window position.
 */
function deflate_slow(s, flush) {
  var hash_head;          /* head of hash chain */
  var bflush;              /* set if current block must be flushed */

  var max_insert;

  /* Process the input block. */
  for (;;) {
    /* Make sure that we always have enough lookahead, except
     * at the end of the input file. We need MAX_MATCH bytes
     * for the next match, plus MIN_MATCH bytes to insert the
     * string following the next match.
     */
    if (s.lookahead < MIN_LOOKAHEAD) {
      fill_window(s);
      if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) { break; } /* flush the current block */
    }

    /* Insert the string window[strstart .. strstart+2] in the
     * dictionary, and set hash_head to the head of the hash chain:
     */
    hash_head = 0/*NIL*/;
    if (s.lookahead >= MIN_MATCH) {
      /*** INSERT_STRING(s, s.strstart, hash_head); ***/
      s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
      hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
      s.head[s.ins_h] = s.strstart;
      /***/
    }

    /* Find the longest match, discarding those <= prev_length.
     */
    s.prev_length = s.match_length;
    s.prev_match = s.match_start;
    s.match_length = MIN_MATCH-1;

    if (hash_head !== 0/*NIL*/ && s.prev_length < s.max_lazy_match &&
        s.strstart - hash_head <= (s.w_size-MIN_LOOKAHEAD)/*MAX_DIST(s)*/) {
      /* To simplify the code, we prevent matches with the string
       * of window index 0 (in particular we have to avoid a match
       * of the string with itself at the start of the input file).
       */
      s.match_length = longest_match(s, hash_head);
      /* longest_match() sets match_start */

      if (s.match_length <= 5 &&
         (s.strategy === Z_FILTERED || (s.match_length === MIN_MATCH && s.strstart - s.match_start > 4096/*TOO_FAR*/))) {

        /* If prev_match is also MIN_MATCH, match_start is garbage
         * but we will ignore the current match anyway.
         */
        s.match_length = MIN_MATCH-1;
      }
    }
    /* If there was a match at the previous step and the current
     * match is not better, output the previous match:
     */
    if (s.prev_length >= MIN_MATCH && s.match_length <= s.prev_length) {
      max_insert = s.strstart + s.lookahead - MIN_MATCH;
      /* Do not insert strings in hash table beyond this. */

      //check_match(s, s.strstart-1, s.prev_match, s.prev_length);

      /***_tr_tally_dist(s, s.strstart - 1 - s.prev_match,
                     s.prev_length - MIN_MATCH, bflush);***/
      bflush = trees._tr_tally(s, s.strstart - 1- s.prev_match, s.prev_length - MIN_MATCH);
      /* Insert in hash table all strings up to the end of the match.
       * strstart-1 and strstart are already inserted. If there is not
       * enough lookahead, the last two strings are not inserted in
       * the hash table.
       */
      s.lookahead -= s.prev_length-1;
      s.prev_length -= 2;
      do {
        if (++s.strstart <= max_insert) {
          /*** INSERT_STRING(s, s.strstart, hash_head); ***/
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          /***/
        }
      } while (--s.prev_length !== 0);
      s.match_available = 0;
      s.match_length = MIN_MATCH-1;
      s.strstart++;

      if (bflush) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }

    } else if (s.match_available) {
      /* If there was no match at the previous position, output a
       * single literal. If there was a match but the current match
       * is longer, truncate the previous match to a single literal.
       */
      //Tracevv((stderr,"%c", s->window[s->strstart-1]));
      /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
      bflush = trees._tr_tally(s, 0, s.window[s.strstart-1]);

      if (bflush) {
        /*** FLUSH_BLOCK_ONLY(s, 0) ***/
        flush_block_only(s, false);
        /***/
      }
      s.strstart++;
      s.lookahead--;
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    } else {
      /* There is no previous match to compare with, wait for
       * the next step to decide.
       */
      s.match_available = 1;
      s.strstart++;
      s.lookahead--;
    }
  }
  //Assert (flush != Z_NO_FLUSH, "no flush?");
  if (s.match_available) {
    //Tracevv((stderr,"%c", s->window[s->strstart-1]));
    /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
    bflush = trees._tr_tally(s, 0, s.window[s.strstart-1]);

    s.match_available = 0;
  }
  s.insert = s.strstart < MIN_MATCH-1 ? s.strstart : MIN_MATCH-1;
  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }

  return BS_BLOCK_DONE;
}


/* ===========================================================================
 * For Z_RLE, simply look for runs of bytes, generate matches only of distance
 * one.  Do not maintain a hash table.  (It will be regenerated if this run of
 * deflate switches away from Z_RLE.)
 */
function deflate_rle(s, flush) {
  var bflush;            /* set if current block must be flushed */
  var prev;              /* byte at distance one to match */
  var scan, strend;      /* scan goes up to strend for length of run */

  var _win = s.window;

  for (;;) {
    /* Make sure that we always have enough lookahead, except
     * at the end of the input file. We need MAX_MATCH bytes
     * for the longest run, plus one for the unrolled loop.
     */
    if (s.lookahead <= MAX_MATCH) {
      fill_window(s);
      if (s.lookahead <= MAX_MATCH && flush === Z_NO_FLUSH) {
        return BS_NEED_MORE;
      }
      if (s.lookahead === 0) { break; } /* flush the current block */
    }

    /* See how many times the previous byte repeats */
    s.match_length = 0;
    if (s.lookahead >= MIN_MATCH && s.strstart > 0) {
      scan = s.strstart - 1;
      prev = _win[scan];
      if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
        strend = s.strstart + MAX_MATCH;
        do {
          /*jshint noempty:false*/
        } while (prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 prev === _win[++scan] && prev === _win[++scan] &&
                 scan < strend);
        s.match_length = MAX_MATCH - (strend - scan);
        if (s.match_length > s.lookahead) {
          s.match_length = s.lookahead;
        }
      }
      //Assert(scan <= s->window+(uInt)(s->window_size-1), "wild scan");
    }

    /* Emit match if have run of MIN_MATCH or longer, else emit literal */
    if (s.match_length >= MIN_MATCH) {
      //check_match(s, s.strstart, s.strstart - 1, s.match_length);

      /*** _tr_tally_dist(s, 1, s.match_length - MIN_MATCH, bflush); ***/
      bflush = trees._tr_tally(s, 1, s.match_length - MIN_MATCH);

      s.lookahead -= s.match_length;
      s.strstart += s.match_length;
      s.match_length = 0;
    } else {
      /* No match, output a literal byte */
      //Tracevv((stderr,"%c", s->window[s->strstart]));
      /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
      bflush = trees._tr_tally(s, 0, s.window[s.strstart]);

      s.lookahead--;
      s.strstart++;
    }
    if (bflush) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }
  return BS_BLOCK_DONE;
}

/* ===========================================================================
 * For Z_HUFFMAN_ONLY, do not look for matches.  Do not maintain a hash table.
 * (It will be regenerated if this run of deflate switches away from Huffman.)
 */
function deflate_huff(s, flush) {
  var bflush;             /* set if current block must be flushed */

  for (;;) {
    /* Make sure that we have a literal to write. */
    if (s.lookahead === 0) {
      fill_window(s);
      if (s.lookahead === 0) {
        if (flush === Z_NO_FLUSH) {
          return BS_NEED_MORE;
        }
        break;      /* flush the current block */
      }
    }

    /* Output a literal byte */
    s.match_length = 0;
    //Tracevv((stderr,"%c", s->window[s->strstart]));
    /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
    bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
    s.lookahead--;
    s.strstart++;
    if (bflush) {
      /*** FLUSH_BLOCK(s, 0); ***/
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
      /***/
    }
  }
  s.insert = 0;
  if (flush === Z_FINISH) {
    /*** FLUSH_BLOCK(s, 1); ***/
    flush_block_only(s, true);
    if (s.strm.avail_out === 0) {
      return BS_FINISH_STARTED;
    }
    /***/
    return BS_FINISH_DONE;
  }
  if (s.last_lit) {
    /*** FLUSH_BLOCK(s, 0); ***/
    flush_block_only(s, false);
    if (s.strm.avail_out === 0) {
      return BS_NEED_MORE;
    }
    /***/
  }
  return BS_BLOCK_DONE;
}

/* Values for max_lazy_match, good_match and max_chain_length, depending on
 * the desired pack level (0..9). The values given below have been tuned to
 * exclude worst case performance for pathological files. Better values may be
 * found for specific files.
 */
var Config = function (good_length, max_lazy, nice_length, max_chain, func) {
  this.good_length = good_length;
  this.max_lazy = max_lazy;
  this.nice_length = nice_length;
  this.max_chain = max_chain;
  this.func = func;
};

var configuration_table;

configuration_table = [
  /*      good lazy nice chain */
  new Config(0, 0, 0, 0, deflate_stored),          /* 0 store only */
  new Config(4, 4, 8, 4, deflate_fast),            /* 1 max speed, no lazy matches */
  new Config(4, 5, 16, 8, deflate_fast),           /* 2 */
  new Config(4, 6, 32, 32, deflate_fast),          /* 3 */

  new Config(4, 4, 16, 16, deflate_slow),          /* 4 lazy matches */
  new Config(8, 16, 32, 32, deflate_slow),         /* 5 */
  new Config(8, 16, 128, 128, deflate_slow),       /* 6 */
  new Config(8, 32, 128, 256, deflate_slow),       /* 7 */
  new Config(32, 128, 258, 1024, deflate_slow),    /* 8 */
  new Config(32, 258, 258, 4096, deflate_slow)     /* 9 max compression */
];


/* ===========================================================================
 * Initialize the "longest match" routines for a new zlib stream
 */
function lm_init(s) {
  s.window_size = 2 * s.w_size;

  /*** CLEAR_HASH(s); ***/
  zero(s.head); // Fill with NIL (= 0);

  /* Set the default configuration parameters:
   */
  s.max_lazy_match = configuration_table[s.level].max_lazy;
  s.good_match = configuration_table[s.level].good_length;
  s.nice_match = configuration_table[s.level].nice_length;
  s.max_chain_length = configuration_table[s.level].max_chain;

  s.strstart = 0;
  s.block_start = 0;
  s.lookahead = 0;
  s.insert = 0;
  s.match_length = s.prev_length = MIN_MATCH - 1;
  s.match_available = 0;
  s.ins_h = 0;
}


function DeflateState() {
  this.strm = null;            /* pointer back to this zlib stream */
  this.status = 0;            /* as the name implies */
  this.pending_buf = null;      /* output still pending */
  this.pending_buf_size = 0;  /* size of pending_buf */
  this.pending_out = 0;       /* next pending byte to output to the stream */
  this.pending = 0;           /* nb of bytes in the pending buffer */
  this.wrap = 0;              /* bit 0 true for zlib, bit 1 true for gzip */
  this.gzhead = null;         /* gzip header information to write */
  this.gzindex = 0;           /* where in extra, name, or comment */
  this.method = Z_DEFLATED; /* can only be DEFLATED */
  this.last_flush = -1;   /* value of flush param for previous deflate call */

  this.w_size = 0;  /* LZ77 window size (32K by default) */
  this.w_bits = 0;  /* log2(w_size)  (8..16) */
  this.w_mask = 0;  /* w_size - 1 */

  this.window = null;
  /* Sliding window. Input bytes are read into the second half of the window,
   * and move to the first half later to keep a dictionary of at least wSize
   * bytes. With this organization, matches are limited to a distance of
   * wSize-MAX_MATCH bytes, but this ensures that IO is always
   * performed with a length multiple of the block size.
   */

  this.window_size = 0;
  /* Actual size of window: 2*wSize, except when the user input buffer
   * is directly used as sliding window.
   */

  this.prev = null;
  /* Link to older string with same hash index. To limit the size of this
   * array to 64K, this link is maintained only for the last 32K strings.
   * An index in this array is thus a window index modulo 32K.
   */

  this.head = null;   /* Heads of the hash chains or NIL. */

  this.ins_h = 0;       /* hash index of string to be inserted */
  this.hash_size = 0;   /* number of elements in hash table */
  this.hash_bits = 0;   /* log2(hash_size) */
  this.hash_mask = 0;   /* hash_size-1 */

  this.hash_shift = 0;
  /* Number of bits by which ins_h must be shifted at each input
   * step. It must be such that after MIN_MATCH steps, the oldest
   * byte no longer takes part in the hash key, that is:
   *   hash_shift * MIN_MATCH >= hash_bits
   */

  this.block_start = 0;
  /* Window position at the beginning of the current output block. Gets
   * negative when the window is moved backwards.
   */

  this.match_length = 0;      /* length of best match */
  this.prev_match = 0;        /* previous match */
  this.match_available = 0;   /* set if previous match exists */
  this.strstart = 0;          /* start of string to insert */
  this.match_start = 0;       /* start of matching string */
  this.lookahead = 0;         /* number of valid bytes ahead in window */

  this.prev_length = 0;
  /* Length of the best match at previous step. Matches not greater than this
   * are discarded. This is used in the lazy match evaluation.
   */

  this.max_chain_length = 0;
  /* To speed up deflation, hash chains are never searched beyond this
   * length.  A higher limit improves compression ratio but degrades the
   * speed.
   */

  this.max_lazy_match = 0;
  /* Attempt to find a better match only when the current match is strictly
   * smaller than this value. This mechanism is used only for compression
   * levels >= 4.
   */
  // That's alias to max_lazy_match, don't use directly
  //this.max_insert_length = 0;
  /* Insert new strings in the hash table only if the match length is not
   * greater than this length. This saves time but degrades compression.
   * max_insert_length is used only for compression levels <= 3.
   */

  this.level = 0;     /* compression level (1..9) */
  this.strategy = 0;  /* favor or force Huffman coding*/

  this.good_match = 0;
  /* Use a faster search when the previous match is longer than this */

  this.nice_match = 0; /* Stop searching when current match exceeds this */

              /* used by trees.c: */

  /* Didn't use ct_data typedef below to suppress compiler warning */

  // struct ct_data_s dyn_ltree[HEAP_SIZE];   /* literal and length tree */
  // struct ct_data_s dyn_dtree[2*D_CODES+1]; /* distance tree */
  // struct ct_data_s bl_tree[2*BL_CODES+1];  /* Huffman tree for bit lengths */

  // Use flat array of DOUBLE size, with interleaved fata,
  // because JS does not support effective
  this.dyn_ltree  = new utils.Buf16(HEAP_SIZE * 2);
  this.dyn_dtree  = new utils.Buf16((2*D_CODES+1) * 2);
  this.bl_tree    = new utils.Buf16((2*BL_CODES+1) * 2);
  zero(this.dyn_ltree);
  zero(this.dyn_dtree);
  zero(this.bl_tree);

  this.l_desc   = null;         /* desc. for literal tree */
  this.d_desc   = null;         /* desc. for distance tree */
  this.bl_desc  = null;         /* desc. for bit length tree */

  //ush bl_count[MAX_BITS+1];
  this.bl_count = new utils.Buf16(MAX_BITS+1);
  /* number of codes at each bit length for an optimal tree */

  //int heap[2*L_CODES+1];      /* heap used to build the Huffman trees */
  this.heap = new utils.Buf16(2*L_CODES+1);  /* heap used to build the Huffman trees */
  zero(this.heap);

  this.heap_len = 0;               /* number of elements in the heap */
  this.heap_max = 0;               /* element of largest frequency */
  /* The sons of heap[n] are heap[2*n] and heap[2*n+1]. heap[0] is not used.
   * The same heap array is used to build all trees.
   */

  this.depth = new utils.Buf16(2*L_CODES+1); //uch depth[2*L_CODES+1];
  zero(this.depth);
  /* Depth of each subtree used as tie breaker for trees of equal frequency
   */

  this.l_buf = 0;          /* buffer index for literals or lengths */

  this.lit_bufsize = 0;
  /* Size of match buffer for literals/lengths.  There are 4 reasons for
   * limiting lit_bufsize to 64K:
   *   - frequencies can be kept in 16 bit counters
   *   - if compression is not successful for the first block, all input
   *     data is still in the window so we can still emit a stored block even
   *     when input comes from standard input.  (This can also be done for
   *     all blocks if lit_bufsize is not greater than 32K.)
   *   - if compression is not successful for a file smaller than 64K, we can
   *     even emit a stored file instead of a stored block (saving 5 bytes).
   *     This is applicable only for zip (not gzip or zlib).
   *   - creating new Huffman trees less frequently may not provide fast
   *     adaptation to changes in the input data statistics. (Take for
   *     example a binary file with poorly compressible code followed by
   *     a highly compressible string table.) Smaller buffer sizes give
   *     fast adaptation but have of course the overhead of transmitting
   *     trees more frequently.
   *   - I can't count above 4
   */

  this.last_lit = 0;      /* running index in l_buf */

  this.d_buf = 0;
  /* Buffer index for distances. To simplify the code, d_buf and l_buf have
   * the same number of elements. To use different lengths, an extra flag
   * array would be necessary.
   */

  this.opt_len = 0;       /* bit length of current block with optimal trees */
  this.static_len = 0;    /* bit length of current block with static trees */
  this.matches = 0;       /* number of string matches in current block */
  this.insert = 0;        /* bytes at end of window left to insert */


  this.bi_buf = 0;
  /* Output buffer. bits are inserted starting at the bottom (least
   * significant bits).
   */
  this.bi_valid = 0;
  /* Number of valid bits in bi_buf.  All bits above the last valid bit
   * are always zero.
   */

  // Used for window memory init. We safely ignore it for JS. That makes
  // sense only for pointers and memory check tools.
  //this.high_water = 0;
  /* High water mark offset in window for initialized bytes -- bytes above
   * this are set to zero in order to avoid memory check warnings when
   * longest match routines access bytes past the input.  This is then
   * updated to the new high water mark.
   */
}


function deflateResetKeep(strm) {
  var s;

  if (!strm || !strm.state) {
    return err(strm, Z_STREAM_ERROR);
  }

  strm.total_in = strm.total_out = 0;
  strm.data_type = Z_UNKNOWN;

  s = strm.state;
  s.pending = 0;
  s.pending_out = 0;

  if (s.wrap < 0) {
    s.wrap = -s.wrap;
    /* was made negative by deflate(..., Z_FINISH); */
  }
  s.status = (s.wrap ? INIT_STATE : BUSY_STATE);
  strm.adler = (s.wrap === 2) ?
    0  // crc32(0, Z_NULL, 0)
  :
    1; // adler32(0, Z_NULL, 0)
  s.last_flush = Z_NO_FLUSH;
  trees._tr_init(s);
  return Z_OK;
}


function deflateReset(strm) {
  var ret = deflateResetKeep(strm);
  if (ret === Z_OK) {
    lm_init(strm.state);
  }
  return ret;
}


function deflateSetHeader(strm, head) {
  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  if (strm.state.wrap !== 2) { return Z_STREAM_ERROR; }
  strm.state.gzhead = head;
  return Z_OK;
}


function deflateInit2(strm, level, method, windowBits, memLevel, strategy) {
  if (!strm) { // === Z_NULL
    return Z_STREAM_ERROR;
  }
  var wrap = 1;

  if (level === Z_DEFAULT_COMPRESSION) {
    level = 6;
  }

  if (windowBits < 0) { /* suppress zlib wrapper */
    wrap = 0;
    windowBits = -windowBits;
  }

  else if (windowBits > 15) {
    wrap = 2;           /* write gzip wrapper instead */
    windowBits -= 16;
  }


  if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED ||
    windowBits < 8 || windowBits > 15 || level < 0 || level > 9 ||
    strategy < 0 || strategy > Z_FIXED) {
    return err(strm, Z_STREAM_ERROR);
  }


  if (windowBits === 8) {
    windowBits = 9;
  }
  /* until 256-byte window bug fixed */

  var s = new DeflateState();

  strm.state = s;
  s.strm = strm;

  s.wrap = wrap;
  s.gzhead = null;
  s.w_bits = windowBits;
  s.w_size = 1 << s.w_bits;
  s.w_mask = s.w_size - 1;

  s.hash_bits = memLevel + 7;
  s.hash_size = 1 << s.hash_bits;
  s.hash_mask = s.hash_size - 1;
  s.hash_shift = ~~((s.hash_bits + MIN_MATCH - 1) / MIN_MATCH);

  s.window = new utils.Buf8(s.w_size * 2);
  s.head = new utils.Buf16(s.hash_size);
  s.prev = new utils.Buf16(s.w_size);

  // Don't need mem init magic for JS.
  //s.high_water = 0;  /* nothing written to s->window yet */

  s.lit_bufsize = 1 << (memLevel + 6); /* 16K elements by default */

  s.pending_buf_size = s.lit_bufsize * 4;
  s.pending_buf = new utils.Buf8(s.pending_buf_size);

  s.d_buf = s.lit_bufsize >> 1;
  s.l_buf = (1 + 2) * s.lit_bufsize;

  s.level = level;
  s.strategy = strategy;
  s.method = method;

  return deflateReset(strm);
}

function deflateInit(strm, level) {
  return deflateInit2(strm, level, Z_DEFLATED, MAX_WBITS, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY);
}


function deflate(strm, flush) {
  var old_flush, s;
  var beg, val; // for gzip header write only

  if (!strm || !strm.state ||
    flush > Z_BLOCK || flush < 0) {
    return strm ? err(strm, Z_STREAM_ERROR) : Z_STREAM_ERROR;
  }

  s = strm.state;

  if (!strm.output ||
      (!strm.input && strm.avail_in !== 0) ||
      (s.status === FINISH_STATE && flush !== Z_FINISH)) {
    return err(strm, (strm.avail_out === 0) ? Z_BUF_ERROR : Z_STREAM_ERROR);
  }

  s.strm = strm; /* just in case */
  old_flush = s.last_flush;
  s.last_flush = flush;

  /* Write the header */
  if (s.status === INIT_STATE) {

    if (s.wrap === 2) { // GZIP header
      strm.adler = 0;  //crc32(0L, Z_NULL, 0);
      put_byte(s, 31);
      put_byte(s, 139);
      put_byte(s, 8);
      if (!s.gzhead) { // s->gzhead == Z_NULL
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, 0);
        put_byte(s, s.level === 9 ? 2 :
                    (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                     4 : 0));
        put_byte(s, OS_CODE);
        s.status = BUSY_STATE;
      }
      else {
        put_byte(s, (s.gzhead.text ? 1 : 0) +
                    (s.gzhead.hcrc ? 2 : 0) +
                    (!s.gzhead.extra ? 0 : 4) +
                    (!s.gzhead.name ? 0 : 8) +
                    (!s.gzhead.comment ? 0 : 16)
                );
        put_byte(s, s.gzhead.time & 0xff);
        put_byte(s, (s.gzhead.time >> 8) & 0xff);
        put_byte(s, (s.gzhead.time >> 16) & 0xff);
        put_byte(s, (s.gzhead.time >> 24) & 0xff);
        put_byte(s, s.level === 9 ? 2 :
                    (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                     4 : 0));
        put_byte(s, s.gzhead.os & 0xff);
        if (s.gzhead.extra && s.gzhead.extra.length) {
          put_byte(s, s.gzhead.extra.length & 0xff);
          put_byte(s, (s.gzhead.extra.length >> 8) & 0xff);
        }
        if (s.gzhead.hcrc) {
          strm.adler = crc32(strm.adler, s.pending_buf, s.pending, 0);
        }
        s.gzindex = 0;
        s.status = EXTRA_STATE;
      }
    }
    else // DEFLATE header
    {
      var header = (Z_DEFLATED + ((s.w_bits - 8) << 4)) << 8;
      var level_flags = -1;

      if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
        level_flags = 0;
      } else if (s.level < 6) {
        level_flags = 1;
      } else if (s.level === 6) {
        level_flags = 2;
      } else {
        level_flags = 3;
      }
      header |= (level_flags << 6);
      if (s.strstart !== 0) { header |= PRESET_DICT; }
      header += 31 - (header % 31);

      s.status = BUSY_STATE;
      putShortMSB(s, header);

      /* Save the adler32 of the preset dictionary: */
      if (s.strstart !== 0) {
        putShortMSB(s, strm.adler >>> 16);
        putShortMSB(s, strm.adler & 0xffff);
      }
      strm.adler = 1; // adler32(0L, Z_NULL, 0);
    }
  }

//#ifdef GZIP
  if (s.status === EXTRA_STATE) {
    if (s.gzhead.extra/* != Z_NULL*/) {
      beg = s.pending;  /* start of bytes to update crc */

      while (s.gzindex < (s.gzhead.extra.length & 0xffff)) {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            break;
          }
        }
        put_byte(s, s.gzhead.extra[s.gzindex] & 0xff);
        s.gzindex++;
      }
      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (s.gzindex === s.gzhead.extra.length) {
        s.gzindex = 0;
        s.status = NAME_STATE;
      }
    }
    else {
      s.status = NAME_STATE;
    }
  }
  if (s.status === NAME_STATE) {
    if (s.gzhead.name/* != Z_NULL*/) {
      beg = s.pending;  /* start of bytes to update crc */
      //int val;

      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            val = 1;
            break;
          }
        }
        // JS specific: little magic to add zero terminator to end of string
        if (s.gzindex < s.gzhead.name.length) {
          val = s.gzhead.name.charCodeAt(s.gzindex++) & 0xff;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);

      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (val === 0) {
        s.gzindex = 0;
        s.status = COMMENT_STATE;
      }
    }
    else {
      s.status = COMMENT_STATE;
    }
  }
  if (s.status === COMMENT_STATE) {
    if (s.gzhead.comment/* != Z_NULL*/) {
      beg = s.pending;  /* start of bytes to update crc */
      //int val;

      do {
        if (s.pending === s.pending_buf_size) {
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          flush_pending(strm);
          beg = s.pending;
          if (s.pending === s.pending_buf_size) {
            val = 1;
            break;
          }
        }
        // JS specific: little magic to add zero terminator to end of string
        if (s.gzindex < s.gzhead.comment.length) {
          val = s.gzhead.comment.charCodeAt(s.gzindex++) & 0xff;
        } else {
          val = 0;
        }
        put_byte(s, val);
      } while (val !== 0);

      if (s.gzhead.hcrc && s.pending > beg) {
        strm.adler = crc32(strm.adler, s.pending_buf, s.pending - beg, beg);
      }
      if (val === 0) {
        s.status = HCRC_STATE;
      }
    }
    else {
      s.status = HCRC_STATE;
    }
  }
  if (s.status === HCRC_STATE) {
    if (s.gzhead.hcrc) {
      if (s.pending + 2 > s.pending_buf_size) {
        flush_pending(strm);
      }
      if (s.pending + 2 <= s.pending_buf_size) {
        put_byte(s, strm.adler & 0xff);
        put_byte(s, (strm.adler >> 8) & 0xff);
        strm.adler = 0; //crc32(0L, Z_NULL, 0);
        s.status = BUSY_STATE;
      }
    }
    else {
      s.status = BUSY_STATE;
    }
  }
//#endif

  /* Flush as much pending output as possible */
  if (s.pending !== 0) {
    flush_pending(strm);
    if (strm.avail_out === 0) {
      /* Since avail_out is 0, deflate will be called again with
       * more output space, but possibly with both pending and
       * avail_in equal to zero. There won't be anything to do,
       * but this is not an error situation so make sure we
       * return OK instead of BUF_ERROR at next call of deflate:
       */
      s.last_flush = -1;
      return Z_OK;
    }

    /* Make sure there is something to do and avoid duplicate consecutive
     * flushes. For repeated and useless calls with Z_FINISH, we keep
     * returning Z_STREAM_END instead of Z_BUF_ERROR.
     */
  } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) &&
    flush !== Z_FINISH) {
    return err(strm, Z_BUF_ERROR);
  }

  /* User must not provide more input after the first FINISH: */
  if (s.status === FINISH_STATE && strm.avail_in !== 0) {
    return err(strm, Z_BUF_ERROR);
  }

  /* Start a new block or continue the current one.
   */
  if (strm.avail_in !== 0 || s.lookahead !== 0 ||
    (flush !== Z_NO_FLUSH && s.status !== FINISH_STATE)) {
    var bstate = (s.strategy === Z_HUFFMAN_ONLY) ? deflate_huff(s, flush) :
      (s.strategy === Z_RLE ? deflate_rle(s, flush) :
        configuration_table[s.level].func(s, flush));

    if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
      s.status = FINISH_STATE;
    }
    if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
      if (strm.avail_out === 0) {
        s.last_flush = -1;
        /* avoid BUF_ERROR next call, see above */
      }
      return Z_OK;
      /* If flush != Z_NO_FLUSH && avail_out == 0, the next call
       * of deflate should use the same flush parameter to make sure
       * that the flush is complete. So we don't have to output an
       * empty block here, this will be done at next call. This also
       * ensures that for a very small output buffer, we emit at most
       * one empty block.
       */
    }
    if (bstate === BS_BLOCK_DONE) {
      if (flush === Z_PARTIAL_FLUSH) {
        trees._tr_align(s);
      }
      else if (flush !== Z_BLOCK) { /* FULL_FLUSH or SYNC_FLUSH */

        trees._tr_stored_block(s, 0, 0, false);
        /* For a full flush, this empty block will be recognized
         * as a special marker by inflate_sync().
         */
        if (flush === Z_FULL_FLUSH) {
          /*** CLEAR_HASH(s); ***/             /* forget history */
          zero(s.head); // Fill with NIL (= 0);

          if (s.lookahead === 0) {
            s.strstart = 0;
            s.block_start = 0;
            s.insert = 0;
          }
        }
      }
      flush_pending(strm);
      if (strm.avail_out === 0) {
        s.last_flush = -1; /* avoid BUF_ERROR at next call, see above */
        return Z_OK;
      }
    }
  }
  //Assert(strm->avail_out > 0, "bug2");
  //if (strm.avail_out <= 0) { throw new Error("bug2");}

  if (flush !== Z_FINISH) { return Z_OK; }
  if (s.wrap <= 0) { return Z_STREAM_END; }

  /* Write the trailer */
  if (s.wrap === 2) {
    put_byte(s, strm.adler & 0xff);
    put_byte(s, (strm.adler >> 8) & 0xff);
    put_byte(s, (strm.adler >> 16) & 0xff);
    put_byte(s, (strm.adler >> 24) & 0xff);
    put_byte(s, strm.total_in & 0xff);
    put_byte(s, (strm.total_in >> 8) & 0xff);
    put_byte(s, (strm.total_in >> 16) & 0xff);
    put_byte(s, (strm.total_in >> 24) & 0xff);
  }
  else
  {
    putShortMSB(s, strm.adler >>> 16);
    putShortMSB(s, strm.adler & 0xffff);
  }

  flush_pending(strm);
  /* If avail_out is zero, the application will call deflate again
   * to flush the rest.
   */
  if (s.wrap > 0) { s.wrap = -s.wrap; }
  /* write the trailer only once! */
  return s.pending !== 0 ? Z_OK : Z_STREAM_END;
}

function deflateEnd(strm) {
  var status;

  if (!strm/*== Z_NULL*/ || !strm.state/*== Z_NULL*/) {
    return Z_STREAM_ERROR;
  }

  status = strm.state.status;
  if (status !== INIT_STATE &&
    status !== EXTRA_STATE &&
    status !== NAME_STATE &&
    status !== COMMENT_STATE &&
    status !== HCRC_STATE &&
    status !== BUSY_STATE &&
    status !== FINISH_STATE
  ) {
    return err(strm, Z_STREAM_ERROR);
  }

  strm.state = null;

  return status === BUSY_STATE ? err(strm, Z_DATA_ERROR) : Z_OK;
}

/* =========================================================================
 * Copy the source state to the destination state
 */
//function deflateCopy(dest, source) {
//
//}

exports.deflateInit = deflateInit;
exports.deflateInit2 = deflateInit2;
exports.deflateReset = deflateReset;
exports.deflateResetKeep = deflateResetKeep;
exports.deflateSetHeader = deflateSetHeader;
exports.deflate = deflate;
exports.deflateEnd = deflateEnd;
exports.deflateInfo = 'pako deflate (from Nodeca project)';

/* Not implemented
exports.deflateBound = deflateBound;
exports.deflateCopy = deflateCopy;
exports.deflateSetDictionary = deflateSetDictionary;
exports.deflateParams = deflateParams;
exports.deflatePending = deflatePending;
exports.deflatePrime = deflatePrime;
exports.deflateTune = deflateTune;
*/

},{"../utils/common":30,"./adler32":32,"./crc32":34,"./messages":40,"./trees":41}],36:[function(require,module,exports){
'use strict';


function GZheader() {
  /* true if compressed data believed to be text */
  this.text       = 0;
  /* modification time */
  this.time       = 0;
  /* extra flags (not used when writing a gzip file) */
  this.xflags     = 0;
  /* operating system */
  this.os         = 0;
  /* pointer to extra field or Z_NULL if none */
  this.extra      = null;
  /* extra field length (valid if extra != Z_NULL) */
  this.extra_len  = 0; // Actually, we don't need it in JS,
                       // but leave for few code modifications

  //
  // Setup limits is not necessary because in js we should not preallocate memory
  // for inflate use constant limit in 65536 bytes
  //

  /* space at extra (only when reading header) */
  // this.extra_max  = 0;
  /* pointer to zero-terminated file name or Z_NULL */
  this.name       = '';
  /* space at name (only when reading header) */
  // this.name_max   = 0;
  /* pointer to zero-terminated comment or Z_NULL */
  this.comment    = '';
  /* space at comment (only when reading header) */
  // this.comm_max   = 0;
  /* true if there was or will be a header crc */
  this.hcrc       = 0;
  /* true when done reading gzip header (not used when writing a gzip file) */
  this.done       = false;
}

module.exports = GZheader;

},{}],37:[function(require,module,exports){
'use strict';

// See state defs from inflate.js
var BAD = 30;       /* got a data error -- remain here until reset */
var TYPE = 12;      /* i: waiting for type bits, including last-flag bit */

/*
   Decode literal, length, and distance codes and write out the resulting
   literal and match bytes until either not enough input or output is
   available, an end-of-block is encountered, or a data error is encountered.
   When large enough input and output buffers are supplied to inflate(), for
   example, a 16K input buffer and a 64K output buffer, more than 95% of the
   inflate execution time is spent in this routine.

   Entry assumptions:

        state.mode === LEN
        strm.avail_in >= 6
        strm.avail_out >= 258
        start >= strm.avail_out
        state.bits < 8

   On return, state.mode is one of:

        LEN -- ran out of enough output space or enough available input
        TYPE -- reached end of block code, inflate() to interpret next block
        BAD -- error in block data

   Notes:

    - The maximum input bits used by a length/distance pair is 15 bits for the
      length code, 5 bits for the length extra, 15 bits for the distance code,
      and 13 bits for the distance extra.  This totals 48 bits, or six bytes.
      Therefore if strm.avail_in >= 6, then there is enough input to avoid
      checking for available input while decoding.

    - The maximum bytes that a single length/distance pair can output is 258
      bytes, which is the maximum length that can be coded.  inflate_fast()
      requires strm.avail_out >= 258 for each loop to avoid checking for
      output space.
 */
module.exports = function inflate_fast(strm, start) {
  var state;
  var _in;                    /* local strm.input */
  var last;                   /* have enough input while in < last */
  var _out;                   /* local strm.output */
  var beg;                    /* inflate()'s initial strm.output */
  var end;                    /* while out < end, enough space available */
//#ifdef INFLATE_STRICT
  var dmax;                   /* maximum distance from zlib header */
//#endif
  var wsize;                  /* window size or zero if not using window */
  var whave;                  /* valid bytes in the window */
  var wnext;                  /* window write index */
  // Use `s_window` instead `window`, avoid conflict with instrumentation tools
  var s_window;               /* allocated sliding window, if wsize != 0 */
  var hold;                   /* local strm.hold */
  var bits;                   /* local strm.bits */
  var lcode;                  /* local strm.lencode */
  var dcode;                  /* local strm.distcode */
  var lmask;                  /* mask for first level of length codes */
  var dmask;                  /* mask for first level of distance codes */
  var here;                   /* retrieved table entry */
  var op;                     /* code bits, operation, extra bits, or */
                              /*  window position, window bytes to copy */
  var len;                    /* match length, unused bytes */
  var dist;                   /* match distance */
  var from;                   /* where to copy match from */
  var from_source;


  var input, output; // JS specific, because we have no pointers

  /* copy state to local variables */
  state = strm.state;
  //here = state.here;
  _in = strm.next_in;
  input = strm.input;
  last = _in + (strm.avail_in - 5);
  _out = strm.next_out;
  output = strm.output;
  beg = _out - (start - strm.avail_out);
  end = _out + (strm.avail_out - 257);
//#ifdef INFLATE_STRICT
  dmax = state.dmax;
//#endif
  wsize = state.wsize;
  whave = state.whave;
  wnext = state.wnext;
  s_window = state.window;
  hold = state.hold;
  bits = state.bits;
  lcode = state.lencode;
  dcode = state.distcode;
  lmask = (1 << state.lenbits) - 1;
  dmask = (1 << state.distbits) - 1;


  /* decode literals and length/distances until end-of-block or not enough
     input data or output space */

  top:
  do {
    if (bits < 15) {
      hold += input[_in++] << bits;
      bits += 8;
      hold += input[_in++] << bits;
      bits += 8;
    }

    here = lcode[hold & lmask];

    dolen:
    for (;;) { // Goto emulation
      op = here >>> 24/*here.bits*/;
      hold >>>= op;
      bits -= op;
      op = (here >>> 16) & 0xff/*here.op*/;
      if (op === 0) {                          /* literal */
        //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
        //        "inflate:         literal '%c'\n" :
        //        "inflate:         literal 0x%02x\n", here.val));
        output[_out++] = here & 0xffff/*here.val*/;
      }
      else if (op & 16) {                     /* length base */
        len = here & 0xffff/*here.val*/;
        op &= 15;                           /* number of extra bits */
        if (op) {
          if (bits < op) {
            hold += input[_in++] << bits;
            bits += 8;
          }
          len += hold & ((1 << op) - 1);
          hold >>>= op;
          bits -= op;
        }
        //Tracevv((stderr, "inflate:         length %u\n", len));
        if (bits < 15) {
          hold += input[_in++] << bits;
          bits += 8;
          hold += input[_in++] << bits;
          bits += 8;
        }
        here = dcode[hold & dmask];

        dodist:
        for (;;) { // goto emulation
          op = here >>> 24/*here.bits*/;
          hold >>>= op;
          bits -= op;
          op = (here >>> 16) & 0xff/*here.op*/;

          if (op & 16) {                      /* distance base */
            dist = here & 0xffff/*here.val*/;
            op &= 15;                       /* number of extra bits */
            if (bits < op) {
              hold += input[_in++] << bits;
              bits += 8;
              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
              }
            }
            dist += hold & ((1 << op) - 1);
//#ifdef INFLATE_STRICT
            if (dist > dmax) {
              strm.msg = 'invalid distance too far back';
              state.mode = BAD;
              break top;
            }
//#endif
            hold >>>= op;
            bits -= op;
            //Tracevv((stderr, "inflate:         distance %u\n", dist));
            op = _out - beg;                /* max distance in output */
            if (dist > op) {                /* see if copy from window */
              op = dist - op;               /* distance back in window */
              if (op > whave) {
                if (state.sane) {
                  strm.msg = 'invalid distance too far back';
                  state.mode = BAD;
                  break top;
                }

// (!) This block is disabled in zlib defailts,
// don't enable it for binary compatibility
//#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
//                if (len <= op - whave) {
//                  do {
//                    output[_out++] = 0;
//                  } while (--len);
//                  continue top;
//                }
//                len -= op - whave;
//                do {
//                  output[_out++] = 0;
//                } while (--op > whave);
//                if (op === 0) {
//                  from = _out - dist;
//                  do {
//                    output[_out++] = output[from++];
//                  } while (--len);
//                  continue top;
//                }
//#endif
              }
              from = 0; // window index
              from_source = s_window;
              if (wnext === 0) {           /* very common case */
                from += wsize - op;
                if (op < len) {         /* some from window */
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = _out - dist;  /* rest from output */
                  from_source = output;
                }
              }
              else if (wnext < op) {      /* wrap around window */
                from += wsize + wnext - op;
                op -= wnext;
                if (op < len) {         /* some from end of window */
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = 0;
                  if (wnext < len) {  /* some from start of window */
                    op = wnext;
                    len -= op;
                    do {
                      output[_out++] = s_window[from++];
                    } while (--op);
                    from = _out - dist;      /* rest from output */
                    from_source = output;
                  }
                }
              }
              else {                      /* contiguous in window */
                from += wnext - op;
                if (op < len) {         /* some from window */
                  len -= op;
                  do {
                    output[_out++] = s_window[from++];
                  } while (--op);
                  from = _out - dist;  /* rest from output */
                  from_source = output;
                }
              }
              while (len > 2) {
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                output[_out++] = from_source[from++];
                len -= 3;
              }
              if (len) {
                output[_out++] = from_source[from++];
                if (len > 1) {
                  output[_out++] = from_source[from++];
                }
              }
            }
            else {
              from = _out - dist;          /* copy direct from output */
              do {                        /* minimum length is three */
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                output[_out++] = output[from++];
                len -= 3;
              } while (len > 2);
              if (len) {
                output[_out++] = output[from++];
                if (len > 1) {
                  output[_out++] = output[from++];
                }
              }
            }
          }
          else if ((op & 64) === 0) {          /* 2nd level distance code */
            here = dcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
            continue dodist;
          }
          else {
            strm.msg = 'invalid distance code';
            state.mode = BAD;
            break top;
          }

          break; // need to emulate goto via "continue"
        }
      }
      else if ((op & 64) === 0) {              /* 2nd level length code */
        here = lcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
        continue dolen;
      }
      else if (op & 32) {                     /* end-of-block */
        //Tracevv((stderr, "inflate:         end of block\n"));
        state.mode = TYPE;
        break top;
      }
      else {
        strm.msg = 'invalid literal/length code';
        state.mode = BAD;
        break top;
      }

      break; // need to emulate goto via "continue"
    }
  } while (_in < last && _out < end);

  /* return unused bytes (on entry, bits < 8, so in won't go too far back) */
  len = bits >> 3;
  _in -= len;
  bits -= len << 3;
  hold &= (1 << bits) - 1;

  /* update state and return */
  strm.next_in = _in;
  strm.next_out = _out;
  strm.avail_in = (_in < last ? 5 + (last - _in) : 5 - (_in - last));
  strm.avail_out = (_out < end ? 257 + (end - _out) : 257 - (_out - end));
  state.hold = hold;
  state.bits = bits;
  return;
};

},{}],38:[function(require,module,exports){
'use strict';


var utils = require('../utils/common');
var adler32 = require('./adler32');
var crc32   = require('./crc32');
var inflate_fast = require('./inffast');
var inflate_table = require('./inftrees');

var CODES = 0;
var LENS = 1;
var DISTS = 2;

/* Public constants ==========================================================*/
/* ===========================================================================*/


/* Allowed flush values; see deflate() and inflate() below for details */
//var Z_NO_FLUSH      = 0;
//var Z_PARTIAL_FLUSH = 1;
//var Z_SYNC_FLUSH    = 2;
//var Z_FULL_FLUSH    = 3;
var Z_FINISH        = 4;
var Z_BLOCK         = 5;
var Z_TREES         = 6;


/* Return codes for the compression/decompression functions. Negative values
 * are errors, positive values are used for special but normal events.
 */
var Z_OK            = 0;
var Z_STREAM_END    = 1;
var Z_NEED_DICT     = 2;
//var Z_ERRNO         = -1;
var Z_STREAM_ERROR  = -2;
var Z_DATA_ERROR    = -3;
var Z_MEM_ERROR     = -4;
var Z_BUF_ERROR     = -5;
//var Z_VERSION_ERROR = -6;

/* The deflate compression method */
var Z_DEFLATED  = 8;


/* STATES ====================================================================*/
/* ===========================================================================*/


var    HEAD = 1;       /* i: waiting for magic header */
var    FLAGS = 2;      /* i: waiting for method and flags (gzip) */
var    TIME = 3;       /* i: waiting for modification time (gzip) */
var    OS = 4;         /* i: waiting for extra flags and operating system (gzip) */
var    EXLEN = 5;      /* i: waiting for extra length (gzip) */
var    EXTRA = 6;      /* i: waiting for extra bytes (gzip) */
var    NAME = 7;       /* i: waiting for end of file name (gzip) */
var    COMMENT = 8;    /* i: waiting for end of comment (gzip) */
var    HCRC = 9;       /* i: waiting for header crc (gzip) */
var    DICTID = 10;    /* i: waiting for dictionary check value */
var    DICT = 11;      /* waiting for inflateSetDictionary() call */
var        TYPE = 12;      /* i: waiting for type bits, including last-flag bit */
var        TYPEDO = 13;    /* i: same, but skip check to exit inflate on new block */
var        STORED = 14;    /* i: waiting for stored size (length and complement) */
var        COPY_ = 15;     /* i/o: same as COPY below, but only first time in */
var        COPY = 16;      /* i/o: waiting for input or output to copy stored block */
var        TABLE = 17;     /* i: waiting for dynamic block table lengths */
var        LENLENS = 18;   /* i: waiting for code length code lengths */
var        CODELENS = 19;  /* i: waiting for length/lit and distance code lengths */
var            LEN_ = 20;      /* i: same as LEN below, but only first time in */
var            LEN = 21;       /* i: waiting for length/lit/eob code */
var            LENEXT = 22;    /* i: waiting for length extra bits */
var            DIST = 23;      /* i: waiting for distance code */
var            DISTEXT = 24;   /* i: waiting for distance extra bits */
var            MATCH = 25;     /* o: waiting for output space to copy string */
var            LIT = 26;       /* o: waiting for output space to write literal */
var    CHECK = 27;     /* i: waiting for 32-bit check value */
var    LENGTH = 28;    /* i: waiting for 32-bit length (gzip) */
var    DONE = 29;      /* finished check, done -- remain here until reset */
var    BAD = 30;       /* got a data error -- remain here until reset */
var    MEM = 31;       /* got an inflate() memory error -- remain here until reset */
var    SYNC = 32;      /* looking for synchronization bytes to restart inflate() */

/* ===========================================================================*/



var ENOUGH_LENS = 852;
var ENOUGH_DISTS = 592;
//var ENOUGH =  (ENOUGH_LENS+ENOUGH_DISTS);

var MAX_WBITS = 15;
/* 32K LZ77 window */
var DEF_WBITS = MAX_WBITS;


function ZSWAP32(q) {
  return  (((q >>> 24) & 0xff) +
          ((q >>> 8) & 0xff00) +
          ((q & 0xff00) << 8) +
          ((q & 0xff) << 24));
}


function InflateState() {
  this.mode = 0;             /* current inflate mode */
  this.last = false;          /* true if processing last block */
  this.wrap = 0;              /* bit 0 true for zlib, bit 1 true for gzip */
  this.havedict = false;      /* true if dictionary provided */
  this.flags = 0;             /* gzip header method and flags (0 if zlib) */
  this.dmax = 0;              /* zlib header max distance (INFLATE_STRICT) */
  this.check = 0;             /* protected copy of check value */
  this.total = 0;             /* protected copy of output count */
  // TODO: may be {}
  this.head = null;           /* where to save gzip header information */

  /* sliding window */
  this.wbits = 0;             /* log base 2 of requested window size */
  this.wsize = 0;             /* window size or zero if not using window */
  this.whave = 0;             /* valid bytes in the window */
  this.wnext = 0;             /* window write index */
  this.window = null;         /* allocated sliding window, if needed */

  /* bit accumulator */
  this.hold = 0;              /* input bit accumulator */
  this.bits = 0;              /* number of bits in "in" */

  /* for string and stored block copying */
  this.length = 0;            /* literal or length of data to copy */
  this.offset = 0;            /* distance back to copy string from */

  /* for table and code decoding */
  this.extra = 0;             /* extra bits needed */

  /* fixed and dynamic code tables */
  this.lencode = null;          /* starting table for length/literal codes */
  this.distcode = null;         /* starting table for distance codes */
  this.lenbits = 0;           /* index bits for lencode */
  this.distbits = 0;          /* index bits for distcode */

  /* dynamic table building */
  this.ncode = 0;             /* number of code length code lengths */
  this.nlen = 0;              /* number of length code lengths */
  this.ndist = 0;             /* number of distance code lengths */
  this.have = 0;              /* number of code lengths in lens[] */
  this.next = null;              /* next available space in codes[] */

  this.lens = new utils.Buf16(320); /* temporary storage for code lengths */
  this.work = new utils.Buf16(288); /* work area for code table building */

  /*
   because we don't have pointers in js, we use lencode and distcode directly
   as buffers so we don't need codes
  */
  //this.codes = new utils.Buf32(ENOUGH);       /* space for code tables */
  this.lendyn = null;              /* dynamic table for length/literal codes (JS specific) */
  this.distdyn = null;             /* dynamic table for distance codes (JS specific) */
  this.sane = 0;                   /* if false, allow invalid distance too far */
  this.back = 0;                   /* bits back of last unprocessed length/lit */
  this.was = 0;                    /* initial length of match */
}

function inflateResetKeep(strm) {
  var state;

  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;
  strm.total_in = strm.total_out = state.total = 0;
  strm.msg = ''; /*Z_NULL*/
  if (state.wrap) {       /* to support ill-conceived Java test suite */
    strm.adler = state.wrap & 1;
  }
  state.mode = HEAD;
  state.last = 0;
  state.havedict = 0;
  state.dmax = 32768;
  state.head = null/*Z_NULL*/;
  state.hold = 0;
  state.bits = 0;
  //state.lencode = state.distcode = state.next = state.codes;
  state.lencode = state.lendyn = new utils.Buf32(ENOUGH_LENS);
  state.distcode = state.distdyn = new utils.Buf32(ENOUGH_DISTS);

  state.sane = 1;
  state.back = -1;
  //Tracev((stderr, "inflate: reset\n"));
  return Z_OK;
}

function inflateReset(strm) {
  var state;

  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;
  state.wsize = 0;
  state.whave = 0;
  state.wnext = 0;
  return inflateResetKeep(strm);

}

function inflateReset2(strm, windowBits) {
  var wrap;
  var state;

  /* get the state */
  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;

  /* extract wrap request from windowBits parameter */
  if (windowBits < 0) {
    wrap = 0;
    windowBits = -windowBits;
  }
  else {
    wrap = (windowBits >> 4) + 1;
    if (windowBits < 48) {
      windowBits &= 15;
    }
  }

  /* set number of window bits, free window if different */
  if (windowBits && (windowBits < 8 || windowBits > 15)) {
    return Z_STREAM_ERROR;
  }
  if (state.window !== null && state.wbits !== windowBits) {
    state.window = null;
  }

  /* update state and reset the rest of it */
  state.wrap = wrap;
  state.wbits = windowBits;
  return inflateReset(strm);
}

function inflateInit2(strm, windowBits) {
  var ret;
  var state;

  if (!strm) { return Z_STREAM_ERROR; }
  //strm.msg = Z_NULL;                 /* in case we return an error */

  state = new InflateState();

  //if (state === Z_NULL) return Z_MEM_ERROR;
  //Tracev((stderr, "inflate: allocated\n"));
  strm.state = state;
  state.window = null/*Z_NULL*/;
  ret = inflateReset2(strm, windowBits);
  if (ret !== Z_OK) {
    strm.state = null/*Z_NULL*/;
  }
  return ret;
}

function inflateInit(strm) {
  return inflateInit2(strm, DEF_WBITS);
}


/*
 Return state with length and distance decoding tables and index sizes set to
 fixed code decoding.  Normally this returns fixed tables from inffixed.h.
 If BUILDFIXED is defined, then instead this routine builds the tables the
 first time it's called, and returns those tables the first time and
 thereafter.  This reduces the size of the code by about 2K bytes, in
 exchange for a little execution time.  However, BUILDFIXED should not be
 used for threaded applications, since the rewriting of the tables and virgin
 may not be thread-safe.
 */
var virgin = true;

var lenfix, distfix; // We have no pointers in JS, so keep tables separate

function fixedtables(state) {
  /* build fixed huffman tables if first call (may not be thread safe) */
  if (virgin) {
    var sym;

    lenfix = new utils.Buf32(512);
    distfix = new utils.Buf32(32);

    /* literal/length table */
    sym = 0;
    while (sym < 144) { state.lens[sym++] = 8; }
    while (sym < 256) { state.lens[sym++] = 9; }
    while (sym < 280) { state.lens[sym++] = 7; }
    while (sym < 288) { state.lens[sym++] = 8; }

    inflate_table(LENS,  state.lens, 0, 288, lenfix,   0, state.work, {bits: 9});

    /* distance table */
    sym = 0;
    while (sym < 32) { state.lens[sym++] = 5; }

    inflate_table(DISTS, state.lens, 0, 32,   distfix, 0, state.work, {bits: 5});

    /* do this just once */
    virgin = false;
  }

  state.lencode = lenfix;
  state.lenbits = 9;
  state.distcode = distfix;
  state.distbits = 5;
}


/*
 Update the window with the last wsize (normally 32K) bytes written before
 returning.  If window does not exist yet, create it.  This is only called
 when a window is already in use, or when output has been written during this
 inflate call, but the end of the deflate stream has not been reached yet.
 It is also called to create a window for dictionary data when a dictionary
 is loaded.

 Providing output buffers larger than 32K to inflate() should provide a speed
 advantage, since only the last 32K of output is copied to the sliding window
 upon return from inflate(), and since all distances after the first 32K of
 output will fall in the output data, making match copies simpler and faster.
 The advantage may be dependent on the size of the processor's data caches.
 */
function updatewindow(strm, src, end, copy) {
  var dist;
  var state = strm.state;

  /* if it hasn't been done already, allocate space for the window */
  if (state.window === null) {
    state.wsize = 1 << state.wbits;
    state.wnext = 0;
    state.whave = 0;

    state.window = new utils.Buf8(state.wsize);
  }

  /* copy state->wsize or less output bytes into the circular window */
  if (copy >= state.wsize) {
    utils.arraySet(state.window,src, end - state.wsize, state.wsize, 0);
    state.wnext = 0;
    state.whave = state.wsize;
  }
  else {
    dist = state.wsize - state.wnext;
    if (dist > copy) {
      dist = copy;
    }
    //zmemcpy(state->window + state->wnext, end - copy, dist);
    utils.arraySet(state.window,src, end - copy, dist, state.wnext);
    copy -= dist;
    if (copy) {
      //zmemcpy(state->window, end - copy, copy);
      utils.arraySet(state.window,src, end - copy, copy, 0);
      state.wnext = copy;
      state.whave = state.wsize;
    }
    else {
      state.wnext += dist;
      if (state.wnext === state.wsize) { state.wnext = 0; }
      if (state.whave < state.wsize) { state.whave += dist; }
    }
  }
  return 0;
}

function inflate(strm, flush) {
  var state;
  var input, output;          // input/output buffers
  var next;                   /* next input INDEX */
  var put;                    /* next output INDEX */
  var have, left;             /* available input and output */
  var hold;                   /* bit buffer */
  var bits;                   /* bits in bit buffer */
  var _in, _out;              /* save starting available input and output */
  var copy;                   /* number of stored or match bytes to copy */
  var from;                   /* where to copy match bytes from */
  var from_source;
  var here = 0;               /* current decoding table entry */
  var here_bits, here_op, here_val; // paked "here" denormalized (JS specific)
  //var last;                   /* parent table entry */
  var last_bits, last_op, last_val; // paked "last" denormalized (JS specific)
  var len;                    /* length to copy for repeats, bits to drop */
  var ret;                    /* return code */
  var hbuf = new utils.Buf8(4);    /* buffer for gzip header crc calculation */
  var opts;

  var n; // temporary var for NEED_BITS

  var order = /* permutation of code lengths */
    [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];


  if (!strm || !strm.state || !strm.output ||
      (!strm.input && strm.avail_in !== 0)) {
    return Z_STREAM_ERROR;
  }

  state = strm.state;
  if (state.mode === TYPE) { state.mode = TYPEDO; }    /* skip check */


  //--- LOAD() ---
  put = strm.next_out;
  output = strm.output;
  left = strm.avail_out;
  next = strm.next_in;
  input = strm.input;
  have = strm.avail_in;
  hold = state.hold;
  bits = state.bits;
  //---

  _in = have;
  _out = left;
  ret = Z_OK;

  inf_leave: // goto emulation
  for (;;) {
    switch (state.mode) {
    case HEAD:
      if (state.wrap === 0) {
        state.mode = TYPEDO;
        break;
      }
      //=== NEEDBITS(16);
      while (bits < 16) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      if ((state.wrap & 2) && hold === 0x8b1f) {  /* gzip header */
        state.check = 0/*crc32(0L, Z_NULL, 0)*/;
        //=== CRC2(state.check, hold);
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        state.check = crc32(state.check, hbuf, 2, 0);
        //===//

        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        state.mode = FLAGS;
        break;
      }
      state.flags = 0;           /* expect zlib header */
      if (state.head) {
        state.head.done = false;
      }
      if (!(state.wrap & 1) ||   /* check if zlib header allowed */
        (((hold & 0xff)/*BITS(8)*/ << 8) + (hold >> 8)) % 31) {
        strm.msg = 'incorrect header check';
        state.mode = BAD;
        break;
      }
      if ((hold & 0x0f)/*BITS(4)*/ !== Z_DEFLATED) {
        strm.msg = 'unknown compression method';
        state.mode = BAD;
        break;
      }
      //--- DROPBITS(4) ---//
      hold >>>= 4;
      bits -= 4;
      //---//
      len = (hold & 0x0f)/*BITS(4)*/ + 8;
      if (state.wbits === 0) {
        state.wbits = len;
      }
      else if (len > state.wbits) {
        strm.msg = 'invalid window size';
        state.mode = BAD;
        break;
      }
      state.dmax = 1 << len;
      //Tracev((stderr, "inflate:   zlib header ok\n"));
      strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
      state.mode = hold & 0x200 ? DICTID : TYPE;
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      break;
    case FLAGS:
      //=== NEEDBITS(16); */
      while (bits < 16) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      state.flags = hold;
      if ((state.flags & 0xff) !== Z_DEFLATED) {
        strm.msg = 'unknown compression method';
        state.mode = BAD;
        break;
      }
      if (state.flags & 0xe000) {
        strm.msg = 'unknown header flags set';
        state.mode = BAD;
        break;
      }
      if (state.head) {
        state.head.text = ((hold >> 8) & 1);
      }
      if (state.flags & 0x0200) {
        //=== CRC2(state.check, hold);
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        state.check = crc32(state.check, hbuf, 2, 0);
        //===//
      }
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = TIME;
      /* falls through */
    case TIME:
      //=== NEEDBITS(32); */
      while (bits < 32) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      if (state.head) {
        state.head.time = hold;
      }
      if (state.flags & 0x0200) {
        //=== CRC4(state.check, hold)
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        hbuf[2] = (hold >>> 16) & 0xff;
        hbuf[3] = (hold >>> 24) & 0xff;
        state.check = crc32(state.check, hbuf, 4, 0);
        //===
      }
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = OS;
      /* falls through */
    case OS:
      //=== NEEDBITS(16); */
      while (bits < 16) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      if (state.head) {
        state.head.xflags = (hold & 0xff);
        state.head.os = (hold >> 8);
      }
      if (state.flags & 0x0200) {
        //=== CRC2(state.check, hold);
        hbuf[0] = hold & 0xff;
        hbuf[1] = (hold >>> 8) & 0xff;
        state.check = crc32(state.check, hbuf, 2, 0);
        //===//
      }
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = EXLEN;
      /* falls through */
    case EXLEN:
      if (state.flags & 0x0400) {
        //=== NEEDBITS(16); */
        while (bits < 16) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.length = hold;
        if (state.head) {
          state.head.extra_len = hold;
        }
        if (state.flags & 0x0200) {
          //=== CRC2(state.check, hold);
          hbuf[0] = hold & 0xff;
          hbuf[1] = (hold >>> 8) & 0xff;
          state.check = crc32(state.check, hbuf, 2, 0);
          //===//
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
      }
      else if (state.head) {
        state.head.extra = null/*Z_NULL*/;
      }
      state.mode = EXTRA;
      /* falls through */
    case EXTRA:
      if (state.flags & 0x0400) {
        copy = state.length;
        if (copy > have) { copy = have; }
        if (copy) {
          if (state.head) {
            len = state.head.extra_len - state.length;
            if (!state.head.extra) {
              // Use untyped array for more conveniend processing later
              state.head.extra = new Array(state.head.extra_len);
            }
            utils.arraySet(
              state.head.extra,
              input,
              next,
              // extra field is limited to 65536 bytes
              // - no need for additional size check
              copy,
              /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
              len
            );
            //zmemcpy(state.head.extra + len, next,
            //        len + copy > state.head.extra_max ?
            //        state.head.extra_max - len : copy);
          }
          if (state.flags & 0x0200) {
            state.check = crc32(state.check, input, copy, next);
          }
          have -= copy;
          next += copy;
          state.length -= copy;
        }
        if (state.length) { break inf_leave; }
      }
      state.length = 0;
      state.mode = NAME;
      /* falls through */
    case NAME:
      if (state.flags & 0x0800) {
        if (have === 0) { break inf_leave; }
        copy = 0;
        do {
          // TODO: 2 or 1 bytes?
          len = input[next + copy++];
          /* use constant limit because in js we should not preallocate memory */
          if (state.head && len &&
              (state.length < 65536 /*state.head.name_max*/)) {
            state.head.name += String.fromCharCode(len);
          }
        } while (len && copy < have);

        if (state.flags & 0x0200) {
          state.check = crc32(state.check, input, copy, next);
        }
        have -= copy;
        next += copy;
        if (len) { break inf_leave; }
      }
      else if (state.head) {
        state.head.name = null;
      }
      state.length = 0;
      state.mode = COMMENT;
      /* falls through */
    case COMMENT:
      if (state.flags & 0x1000) {
        if (have === 0) { break inf_leave; }
        copy = 0;
        do {
          len = input[next + copy++];
          /* use constant limit because in js we should not preallocate memory */
          if (state.head && len &&
              (state.length < 65536 /*state.head.comm_max*/)) {
            state.head.comment += String.fromCharCode(len);
          }
        } while (len && copy < have);
        if (state.flags & 0x0200) {
          state.check = crc32(state.check, input, copy, next);
        }
        have -= copy;
        next += copy;
        if (len) { break inf_leave; }
      }
      else if (state.head) {
        state.head.comment = null;
      }
      state.mode = HCRC;
      /* falls through */
    case HCRC:
      if (state.flags & 0x0200) {
        //=== NEEDBITS(16); */
        while (bits < 16) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        if (hold !== (state.check & 0xffff)) {
          strm.msg = 'header crc mismatch';
          state.mode = BAD;
          break;
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
      }
      if (state.head) {
        state.head.hcrc = ((state.flags >> 9) & 1);
        state.head.done = true;
      }
      strm.adler = state.check = 0 /*crc32(0L, Z_NULL, 0)*/;
      state.mode = TYPE;
      break;
    case DICTID:
      //=== NEEDBITS(32); */
      while (bits < 32) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      strm.adler = state.check = ZSWAP32(hold);
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = DICT;
      /* falls through */
    case DICT:
      if (state.havedict === 0) {
        //--- RESTORE() ---
        strm.next_out = put;
        strm.avail_out = left;
        strm.next_in = next;
        strm.avail_in = have;
        state.hold = hold;
        state.bits = bits;
        //---
        return Z_NEED_DICT;
      }
      strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
      state.mode = TYPE;
      /* falls through */
    case TYPE:
      if (flush === Z_BLOCK || flush === Z_TREES) { break inf_leave; }
      /* falls through */
    case TYPEDO:
      if (state.last) {
        //--- BYTEBITS() ---//
        hold >>>= bits & 7;
        bits -= bits & 7;
        //---//
        state.mode = CHECK;
        break;
      }
      //=== NEEDBITS(3); */
      while (bits < 3) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      state.last = (hold & 0x01)/*BITS(1)*/;
      //--- DROPBITS(1) ---//
      hold >>>= 1;
      bits -= 1;
      //---//

      switch ((hold & 0x03)/*BITS(2)*/) {
      case 0:                             /* stored block */
        //Tracev((stderr, "inflate:     stored block%s\n",
        //        state.last ? " (last)" : ""));
        state.mode = STORED;
        break;
      case 1:                             /* fixed block */
        fixedtables(state);
        //Tracev((stderr, "inflate:     fixed codes block%s\n",
        //        state.last ? " (last)" : ""));
        state.mode = LEN_;             /* decode codes */
        if (flush === Z_TREES) {
          //--- DROPBITS(2) ---//
          hold >>>= 2;
          bits -= 2;
          //---//
          break inf_leave;
        }
        break;
      case 2:                             /* dynamic block */
        //Tracev((stderr, "inflate:     dynamic codes block%s\n",
        //        state.last ? " (last)" : ""));
        state.mode = TABLE;
        break;
      case 3:
        strm.msg = 'invalid block type';
        state.mode = BAD;
      }
      //--- DROPBITS(2) ---//
      hold >>>= 2;
      bits -= 2;
      //---//
      break;
    case STORED:
      //--- BYTEBITS() ---// /* go to byte boundary */
      hold >>>= bits & 7;
      bits -= bits & 7;
      //---//
      //=== NEEDBITS(32); */
      while (bits < 32) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      if ((hold & 0xffff) !== ((hold >>> 16) ^ 0xffff)) {
        strm.msg = 'invalid stored block lengths';
        state.mode = BAD;
        break;
      }
      state.length = hold & 0xffff;
      //Tracev((stderr, "inflate:       stored length %u\n",
      //        state.length));
      //=== INITBITS();
      hold = 0;
      bits = 0;
      //===//
      state.mode = COPY_;
      if (flush === Z_TREES) { break inf_leave; }
      /* falls through */
    case COPY_:
      state.mode = COPY;
      /* falls through */
    case COPY:
      copy = state.length;
      if (copy) {
        if (copy > have) { copy = have; }
        if (copy > left) { copy = left; }
        if (copy === 0) { break inf_leave; }
        //--- zmemcpy(put, next, copy); ---
        utils.arraySet(output, input, next, copy, put);
        //---//
        have -= copy;
        next += copy;
        left -= copy;
        put += copy;
        state.length -= copy;
        break;
      }
      //Tracev((stderr, "inflate:       stored end\n"));
      state.mode = TYPE;
      break;
    case TABLE:
      //=== NEEDBITS(14); */
      while (bits < 14) {
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
      }
      //===//
      state.nlen = (hold & 0x1f)/*BITS(5)*/ + 257;
      //--- DROPBITS(5) ---//
      hold >>>= 5;
      bits -= 5;
      //---//
      state.ndist = (hold & 0x1f)/*BITS(5)*/ + 1;
      //--- DROPBITS(5) ---//
      hold >>>= 5;
      bits -= 5;
      //---//
      state.ncode = (hold & 0x0f)/*BITS(4)*/ + 4;
      //--- DROPBITS(4) ---//
      hold >>>= 4;
      bits -= 4;
      //---//
//#ifndef PKZIP_BUG_WORKAROUND
      if (state.nlen > 286 || state.ndist > 30) {
        strm.msg = 'too many length or distance symbols';
        state.mode = BAD;
        break;
      }
//#endif
      //Tracev((stderr, "inflate:       table sizes ok\n"));
      state.have = 0;
      state.mode = LENLENS;
      /* falls through */
    case LENLENS:
      while (state.have < state.ncode) {
        //=== NEEDBITS(3);
        while (bits < 3) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.lens[order[state.have++]] = (hold & 0x07);//BITS(3);
        //--- DROPBITS(3) ---//
        hold >>>= 3;
        bits -= 3;
        //---//
      }
      while (state.have < 19) {
        state.lens[order[state.have++]] = 0;
      }
      // We have separate tables & no pointers. 2 commented lines below not needed.
      //state.next = state.codes;
      //state.lencode = state.next;
      // Switch to use dynamic table
      state.lencode = state.lendyn;
      state.lenbits = 7;

      opts = {bits: state.lenbits};
      ret = inflate_table(CODES, state.lens, 0, 19, state.lencode, 0, state.work, opts);
      state.lenbits = opts.bits;

      if (ret) {
        strm.msg = 'invalid code lengths set';
        state.mode = BAD;
        break;
      }
      //Tracev((stderr, "inflate:       code lengths ok\n"));
      state.have = 0;
      state.mode = CODELENS;
      /* falls through */
    case CODELENS:
      while (state.have < state.nlen + state.ndist) {
        for (;;) {
          here = state.lencode[hold & ((1 << state.lenbits) - 1)];/*BITS(state.lenbits)*/
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;

          if ((here_bits) <= bits) { break; }
          //--- PULLBYTE() ---//
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
          //---//
        }
        if (here_val < 16) {
          //--- DROPBITS(here.bits) ---//
          hold >>>= here_bits;
          bits -= here_bits;
          //---//
          state.lens[state.have++] = here_val;
        }
        else {
          if (here_val === 16) {
            //=== NEEDBITS(here.bits + 2);
            n = here_bits + 2;
            while (bits < n) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            if (state.have === 0) {
              strm.msg = 'invalid bit length repeat';
              state.mode = BAD;
              break;
            }
            len = state.lens[state.have - 1];
            copy = 3 + (hold & 0x03);//BITS(2);
            //--- DROPBITS(2) ---//
            hold >>>= 2;
            bits -= 2;
            //---//
          }
          else if (here_val === 17) {
            //=== NEEDBITS(here.bits + 3);
            n = here_bits + 3;
            while (bits < n) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            len = 0;
            copy = 3 + (hold & 0x07);//BITS(3);
            //--- DROPBITS(3) ---//
            hold >>>= 3;
            bits -= 3;
            //---//
          }
          else {
            //=== NEEDBITS(here.bits + 7);
            n = here_bits + 7;
            while (bits < n) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            len = 0;
            copy = 11 + (hold & 0x7f);//BITS(7);
            //--- DROPBITS(7) ---//
            hold >>>= 7;
            bits -= 7;
            //---//
          }
          if (state.have + copy > state.nlen + state.ndist) {
            strm.msg = 'invalid bit length repeat';
            state.mode = BAD;
            break;
          }
          while (copy--) {
            state.lens[state.have++] = len;
          }
        }
      }

      /* handle error breaks in while */
      if (state.mode === BAD) { break; }

      /* check for end-of-block code (better have one) */
      if (state.lens[256] === 0) {
        strm.msg = 'invalid code -- missing end-of-block';
        state.mode = BAD;
        break;
      }

      /* build code tables -- note: do not change the lenbits or distbits
         values here (9 and 6) without reading the comments in inftrees.h
         concerning the ENOUGH constants, which depend on those values */
      state.lenbits = 9;

      opts = {bits: state.lenbits};
      ret = inflate_table(LENS, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
      // We have separate tables & no pointers. 2 commented lines below not needed.
      // state.next_index = opts.table_index;
      state.lenbits = opts.bits;
      // state.lencode = state.next;

      if (ret) {
        strm.msg = 'invalid literal/lengths set';
        state.mode = BAD;
        break;
      }

      state.distbits = 6;
      //state.distcode.copy(state.codes);
      // Switch to use dynamic table
      state.distcode = state.distdyn;
      opts = {bits: state.distbits};
      ret = inflate_table(DISTS, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
      // We have separate tables & no pointers. 2 commented lines below not needed.
      // state.next_index = opts.table_index;
      state.distbits = opts.bits;
      // state.distcode = state.next;

      if (ret) {
        strm.msg = 'invalid distances set';
        state.mode = BAD;
        break;
      }
      //Tracev((stderr, 'inflate:       codes ok\n'));
      state.mode = LEN_;
      if (flush === Z_TREES) { break inf_leave; }
      /* falls through */
    case LEN_:
      state.mode = LEN;
      /* falls through */
    case LEN:
      if (have >= 6 && left >= 258) {
        //--- RESTORE() ---
        strm.next_out = put;
        strm.avail_out = left;
        strm.next_in = next;
        strm.avail_in = have;
        state.hold = hold;
        state.bits = bits;
        //---
        inflate_fast(strm, _out);
        //--- LOAD() ---
        put = strm.next_out;
        output = strm.output;
        left = strm.avail_out;
        next = strm.next_in;
        input = strm.input;
        have = strm.avail_in;
        hold = state.hold;
        bits = state.bits;
        //---

        if (state.mode === TYPE) {
          state.back = -1;
        }
        break;
      }
      state.back = 0;
      for (;;) {
        here = state.lencode[hold & ((1 << state.lenbits) -1)];  /*BITS(state.lenbits)*/
        here_bits = here >>> 24;
        here_op = (here >>> 16) & 0xff;
        here_val = here & 0xffff;

        if (here_bits <= bits) { break; }
        //--- PULLBYTE() ---//
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
        //---//
      }
      if (here_op && (here_op & 0xf0) === 0) {
        last_bits = here_bits;
        last_op = here_op;
        last_val = here_val;
        for (;;) {
          here = state.lencode[last_val +
                  ((hold & ((1 << (last_bits + last_op)) -1))/*BITS(last.bits + last.op)*/ >> last_bits)];
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;

          if ((last_bits + here_bits) <= bits) { break; }
          //--- PULLBYTE() ---//
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
          //---//
        }
        //--- DROPBITS(last.bits) ---//
        hold >>>= last_bits;
        bits -= last_bits;
        //---//
        state.back += last_bits;
      }
      //--- DROPBITS(here.bits) ---//
      hold >>>= here_bits;
      bits -= here_bits;
      //---//
      state.back += here_bits;
      state.length = here_val;
      if (here_op === 0) {
        //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
        //        "inflate:         literal '%c'\n" :
        //        "inflate:         literal 0x%02x\n", here.val));
        state.mode = LIT;
        break;
      }
      if (here_op & 32) {
        //Tracevv((stderr, "inflate:         end of block\n"));
        state.back = -1;
        state.mode = TYPE;
        break;
      }
      if (here_op & 64) {
        strm.msg = 'invalid literal/length code';
        state.mode = BAD;
        break;
      }
      state.extra = here_op & 15;
      state.mode = LENEXT;
      /* falls through */
    case LENEXT:
      if (state.extra) {
        //=== NEEDBITS(state.extra);
        n = state.extra;
        while (bits < n) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.length += hold & ((1 << state.extra) -1)/*BITS(state.extra)*/;
        //--- DROPBITS(state.extra) ---//
        hold >>>= state.extra;
        bits -= state.extra;
        //---//
        state.back += state.extra;
      }
      //Tracevv((stderr, "inflate:         length %u\n", state.length));
      state.was = state.length;
      state.mode = DIST;
      /* falls through */
    case DIST:
      for (;;) {
        here = state.distcode[hold & ((1 << state.distbits) -1)];/*BITS(state.distbits)*/
        here_bits = here >>> 24;
        here_op = (here >>> 16) & 0xff;
        here_val = here & 0xffff;

        if ((here_bits) <= bits) { break; }
        //--- PULLBYTE() ---//
        if (have === 0) { break inf_leave; }
        have--;
        hold += input[next++] << bits;
        bits += 8;
        //---//
      }
      if ((here_op & 0xf0) === 0) {
        last_bits = here_bits;
        last_op = here_op;
        last_val = here_val;
        for (;;) {
          here = state.distcode[last_val +
                  ((hold & ((1 << (last_bits + last_op)) -1))/*BITS(last.bits + last.op)*/ >> last_bits)];
          here_bits = here >>> 24;
          here_op = (here >>> 16) & 0xff;
          here_val = here & 0xffff;

          if ((last_bits + here_bits) <= bits) { break; }
          //--- PULLBYTE() ---//
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
          //---//
        }
        //--- DROPBITS(last.bits) ---//
        hold >>>= last_bits;
        bits -= last_bits;
        //---//
        state.back += last_bits;
      }
      //--- DROPBITS(here.bits) ---//
      hold >>>= here_bits;
      bits -= here_bits;
      //---//
      state.back += here_bits;
      if (here_op & 64) {
        strm.msg = 'invalid distance code';
        state.mode = BAD;
        break;
      }
      state.offset = here_val;
      state.extra = (here_op) & 15;
      state.mode = DISTEXT;
      /* falls through */
    case DISTEXT:
      if (state.extra) {
        //=== NEEDBITS(state.extra);
        n = state.extra;
        while (bits < n) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        state.offset += hold & ((1 << state.extra) -1)/*BITS(state.extra)*/;
        //--- DROPBITS(state.extra) ---//
        hold >>>= state.extra;
        bits -= state.extra;
        //---//
        state.back += state.extra;
      }
//#ifdef INFLATE_STRICT
      if (state.offset > state.dmax) {
        strm.msg = 'invalid distance too far back';
        state.mode = BAD;
        break;
      }
//#endif
      //Tracevv((stderr, "inflate:         distance %u\n", state.offset));
      state.mode = MATCH;
      /* falls through */
    case MATCH:
      if (left === 0) { break inf_leave; }
      copy = _out - left;
      if (state.offset > copy) {         /* copy from window */
        copy = state.offset - copy;
        if (copy > state.whave) {
          if (state.sane) {
            strm.msg = 'invalid distance too far back';
            state.mode = BAD;
            break;
          }
// (!) This block is disabled in zlib defailts,
// don't enable it for binary compatibility
//#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
//          Trace((stderr, "inflate.c too far\n"));
//          copy -= state.whave;
//          if (copy > state.length) { copy = state.length; }
//          if (copy > left) { copy = left; }
//          left -= copy;
//          state.length -= copy;
//          do {
//            output[put++] = 0;
//          } while (--copy);
//          if (state.length === 0) { state.mode = LEN; }
//          break;
//#endif
        }
        if (copy > state.wnext) {
          copy -= state.wnext;
          from = state.wsize - copy;
        }
        else {
          from = state.wnext - copy;
        }
        if (copy > state.length) { copy = state.length; }
        from_source = state.window;
      }
      else {                              /* copy from output */
        from_source = output;
        from = put - state.offset;
        copy = state.length;
      }
      if (copy > left) { copy = left; }
      left -= copy;
      state.length -= copy;
      do {
        output[put++] = from_source[from++];
      } while (--copy);
      if (state.length === 0) { state.mode = LEN; }
      break;
    case LIT:
      if (left === 0) { break inf_leave; }
      output[put++] = state.length;
      left--;
      state.mode = LEN;
      break;
    case CHECK:
      if (state.wrap) {
        //=== NEEDBITS(32);
        while (bits < 32) {
          if (have === 0) { break inf_leave; }
          have--;
          // Use '|' insdead of '+' to make sure that result is signed
          hold |= input[next++] << bits;
          bits += 8;
        }
        //===//
        _out -= left;
        strm.total_out += _out;
        state.total += _out;
        if (_out) {
          strm.adler = state.check =
              /*UPDATE(state.check, put - _out, _out);*/
              (state.flags ? crc32(state.check, output, _out, put - _out) : adler32(state.check, output, _out, put - _out));

        }
        _out = left;
        // NB: crc32 stored as signed 32-bit int, ZSWAP32 returns signed too
        if ((state.flags ? hold : ZSWAP32(hold)) !== state.check) {
          strm.msg = 'incorrect data check';
          state.mode = BAD;
          break;
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        //Tracev((stderr, "inflate:   check matches trailer\n"));
      }
      state.mode = LENGTH;
      /* falls through */
    case LENGTH:
      if (state.wrap && state.flags) {
        //=== NEEDBITS(32);
        while (bits < 32) {
          if (have === 0) { break inf_leave; }
          have--;
          hold += input[next++] << bits;
          bits += 8;
        }
        //===//
        if (hold !== (state.total & 0xffffffff)) {
          strm.msg = 'incorrect length check';
          state.mode = BAD;
          break;
        }
        //=== INITBITS();
        hold = 0;
        bits = 0;
        //===//
        //Tracev((stderr, "inflate:   length matches trailer\n"));
      }
      state.mode = DONE;
      /* falls through */
    case DONE:
      ret = Z_STREAM_END;
      break inf_leave;
    case BAD:
      ret = Z_DATA_ERROR;
      break inf_leave;
    case MEM:
      return Z_MEM_ERROR;
    case SYNC:
      /* falls through */
    default:
      return Z_STREAM_ERROR;
    }
  }

  // inf_leave <- here is real place for "goto inf_leave", emulated via "break inf_leave"

  /*
     Return from inflate(), updating the total counts and the check value.
     If there was no progress during the inflate() call, return a buffer
     error.  Call updatewindow() to create and/or update the window state.
     Note: a memory error from inflate() is non-recoverable.
   */

  //--- RESTORE() ---
  strm.next_out = put;
  strm.avail_out = left;
  strm.next_in = next;
  strm.avail_in = have;
  state.hold = hold;
  state.bits = bits;
  //---

  if (state.wsize || (_out !== strm.avail_out && state.mode < BAD &&
                      (state.mode < CHECK || flush !== Z_FINISH))) {
    if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) {
      state.mode = MEM;
      return Z_MEM_ERROR;
    }
  }
  _in -= strm.avail_in;
  _out -= strm.avail_out;
  strm.total_in += _in;
  strm.total_out += _out;
  state.total += _out;
  if (state.wrap && _out) {
    strm.adler = state.check = /*UPDATE(state.check, strm.next_out - _out, _out);*/
      (state.flags ? crc32(state.check, output, _out, strm.next_out - _out) : adler32(state.check, output, _out, strm.next_out - _out));
  }
  strm.data_type = state.bits + (state.last ? 64 : 0) +
                    (state.mode === TYPE ? 128 : 0) +
                    (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
  if (((_in === 0 && _out === 0) || flush === Z_FINISH) && ret === Z_OK) {
    ret = Z_BUF_ERROR;
  }
  return ret;
}

function inflateEnd(strm) {

  if (!strm || !strm.state /*|| strm->zfree == (free_func)0*/) {
    return Z_STREAM_ERROR;
  }

  var state = strm.state;
  if (state.window) {
    state.window = null;
  }
  strm.state = null;
  return Z_OK;
}

function inflateGetHeader(strm, head) {
  var state;

  /* check state */
  if (!strm || !strm.state) { return Z_STREAM_ERROR; }
  state = strm.state;
  if ((state.wrap & 2) === 0) { return Z_STREAM_ERROR; }

  /* save header structure */
  state.head = head;
  head.done = false;
  return Z_OK;
}


exports.inflateReset = inflateReset;
exports.inflateReset2 = inflateReset2;
exports.inflateResetKeep = inflateResetKeep;
exports.inflateInit = inflateInit;
exports.inflateInit2 = inflateInit2;
exports.inflate = inflate;
exports.inflateEnd = inflateEnd;
exports.inflateGetHeader = inflateGetHeader;
exports.inflateInfo = 'pako inflate (from Nodeca project)';

/* Not implemented
exports.inflateCopy = inflateCopy;
exports.inflateGetDictionary = inflateGetDictionary;
exports.inflateMark = inflateMark;
exports.inflatePrime = inflatePrime;
exports.inflateSetDictionary = inflateSetDictionary;
exports.inflateSync = inflateSync;
exports.inflateSyncPoint = inflateSyncPoint;
exports.inflateUndermine = inflateUndermine;
*/

},{"../utils/common":30,"./adler32":32,"./crc32":34,"./inffast":37,"./inftrees":39}],39:[function(require,module,exports){
'use strict';


var utils = require('../utils/common');

var MAXBITS = 15;
var ENOUGH_LENS = 852;
var ENOUGH_DISTS = 592;
//var ENOUGH = (ENOUGH_LENS+ENOUGH_DISTS);

var CODES = 0;
var LENS = 1;
var DISTS = 2;

var lbase = [ /* Length codes 257..285 base */
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
  35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
];

var lext = [ /* Length codes 257..285 extra */
  16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18,
  19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78
];

var dbase = [ /* Distance codes 0..29 base */
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
  257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
  8193, 12289, 16385, 24577, 0, 0
];

var dext = [ /* Distance codes 0..29 extra */
  16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22,
  23, 23, 24, 24, 25, 25, 26, 26, 27, 27,
  28, 28, 29, 29, 64, 64
];

module.exports = function inflate_table(type, lens, lens_index, codes, table, table_index, work, opts)
{
  var bits = opts.bits;
      //here = opts.here; /* table entry for duplication */

  var len = 0;               /* a code's length in bits */
  var sym = 0;               /* index of code symbols */
  var min = 0, max = 0;          /* minimum and maximum code lengths */
  var root = 0;              /* number of index bits for root table */
  var curr = 0;              /* number of index bits for current table */
  var drop = 0;              /* code bits to drop for sub-table */
  var left = 0;                   /* number of prefix codes available */
  var used = 0;              /* code entries in table used */
  var huff = 0;              /* Huffman code */
  var incr;              /* for incrementing code, index */
  var fill;              /* index for replicating entries */
  var low;               /* low bits for current root entry */
  var mask;              /* mask for low root bits */
  var next;             /* next available space in table */
  var base = null;     /* base value table to use */
  var base_index = 0;
//  var shoextra;    /* extra bits table to use */
  var end;                    /* use base and extra for symbol > end */
  var count = new utils.Buf16(MAXBITS+1); //[MAXBITS+1];    /* number of codes of each length */
  var offs = new utils.Buf16(MAXBITS+1); //[MAXBITS+1];     /* offsets in table for each length */
  var extra = null;
  var extra_index = 0;

  var here_bits, here_op, here_val;

  /*
   Process a set of code lengths to create a canonical Huffman code.  The
   code lengths are lens[0..codes-1].  Each length corresponds to the
   symbols 0..codes-1.  The Huffman code is generated by first sorting the
   symbols by length from short to long, and retaining the symbol order
   for codes with equal lengths.  Then the code starts with all zero bits
   for the first code of the shortest length, and the codes are integer
   increments for the same length, and zeros are appended as the length
   increases.  For the deflate format, these bits are stored backwards
   from their more natural integer increment ordering, and so when the
   decoding tables are built in the large loop below, the integer codes
   are incremented backwards.

   This routine assumes, but does not check, that all of the entries in
   lens[] are in the range 0..MAXBITS.  The caller must assure this.
   1..MAXBITS is interpreted as that code length.  zero means that that
   symbol does not occur in this code.

   The codes are sorted by computing a count of codes for each length,
   creating from that a table of starting indices for each length in the
   sorted table, and then entering the symbols in order in the sorted
   table.  The sorted table is work[], with that space being provided by
   the caller.

   The length counts are used for other purposes as well, i.e. finding
   the minimum and maximum length codes, determining if there are any
   codes at all, checking for a valid set of lengths, and looking ahead
   at length counts to determine sub-table sizes when building the
   decoding tables.
   */

  /* accumulate lengths for codes (assumes lens[] all in 0..MAXBITS) */
  for (len = 0; len <= MAXBITS; len++) {
    count[len] = 0;
  }
  for (sym = 0; sym < codes; sym++) {
    count[lens[lens_index + sym]]++;
  }

  /* bound code lengths, force root to be within code lengths */
  root = bits;
  for (max = MAXBITS; max >= 1; max--) {
    if (count[max] !== 0) { break; }
  }
  if (root > max) {
    root = max;
  }
  if (max === 0) {                     /* no symbols to code at all */
    //table.op[opts.table_index] = 64;  //here.op = (var char)64;    /* invalid code marker */
    //table.bits[opts.table_index] = 1;   //here.bits = (var char)1;
    //table.val[opts.table_index++] = 0;   //here.val = (var short)0;
    table[table_index++] = (1 << 24) | (64 << 16) | 0;


    //table.op[opts.table_index] = 64;
    //table.bits[opts.table_index] = 1;
    //table.val[opts.table_index++] = 0;
    table[table_index++] = (1 << 24) | (64 << 16) | 0;

    opts.bits = 1;
    return 0;     /* no symbols, but wait for decoding to report error */
  }
  for (min = 1; min < max; min++) {
    if (count[min] !== 0) { break; }
  }
  if (root < min) {
    root = min;
  }

  /* check for an over-subscribed or incomplete set of lengths */
  left = 1;
  for (len = 1; len <= MAXBITS; len++) {
    left <<= 1;
    left -= count[len];
    if (left < 0) {
      return -1;
    }        /* over-subscribed */
  }
  if (left > 0 && (type === CODES || max !== 1)) {
    return -1;                      /* incomplete set */
  }

  /* generate offsets into symbol table for each length for sorting */
  offs[1] = 0;
  for (len = 1; len < MAXBITS; len++) {
    offs[len + 1] = offs[len] + count[len];
  }

  /* sort symbols by length, by symbol order within each length */
  for (sym = 0; sym < codes; sym++) {
    if (lens[lens_index + sym] !== 0) {
      work[offs[lens[lens_index + sym]]++] = sym;
    }
  }

  /*
   Create and fill in decoding tables.  In this loop, the table being
   filled is at next and has curr index bits.  The code being used is huff
   with length len.  That code is converted to an index by dropping drop
   bits off of the bottom.  For codes where len is less than drop + curr,
   those top drop + curr - len bits are incremented through all values to
   fill the table with replicated entries.

   root is the number of index bits for the root table.  When len exceeds
   root, sub-tables are created pointed to by the root entry with an index
   of the low root bits of huff.  This is saved in low to check for when a
   new sub-table should be started.  drop is zero when the root table is
   being filled, and drop is root when sub-tables are being filled.

   When a new sub-table is needed, it is necessary to look ahead in the
   code lengths to determine what size sub-table is needed.  The length
   counts are used for this, and so count[] is decremented as codes are
   entered in the tables.

   used keeps track of how many table entries have been allocated from the
   provided *table space.  It is checked for LENS and DIST tables against
   the constants ENOUGH_LENS and ENOUGH_DISTS to guard against changes in
   the initial root table size constants.  See the comments in inftrees.h
   for more information.

   sym increments through all symbols, and the loop terminates when
   all codes of length max, i.e. all codes, have been processed.  This
   routine permits incomplete codes, so another loop after this one fills
   in the rest of the decoding tables with invalid code markers.
   */

  /* set up for code type */
  // poor man optimization - use if-else instead of switch,
  // to avoid deopts in old v8
  if (type === CODES) {
    base = extra = work;    /* dummy value--not used */
    end = 19;

  } else if (type === LENS) {
    base = lbase;
    base_index -= 257;
    extra = lext;
    extra_index -= 257;
    end = 256;

  } else {                    /* DISTS */
    base = dbase;
    extra = dext;
    end = -1;
  }

  /* initialize opts for loop */
  huff = 0;                   /* starting code */
  sym = 0;                    /* starting code symbol */
  len = min;                  /* starting code length */
  next = table_index;              /* current table to fill in */
  curr = root;                /* current table index bits */
  drop = 0;                   /* current bits to drop from code for index */
  low = -1;                   /* trigger new sub-table when len > root */
  used = 1 << root;          /* use root table entries */
  mask = used - 1;            /* mask for comparing low */

  /* check available table space */
  if ((type === LENS && used > ENOUGH_LENS) ||
    (type === DISTS && used > ENOUGH_DISTS)) {
    return 1;
  }

  var i=0;
  /* process all codes and make table entries */
  for (;;) {
    i++;
    /* create table entry */
    here_bits = len - drop;
    if (work[sym] < end) {
      here_op = 0;
      here_val = work[sym];
    }
    else if (work[sym] > end) {
      here_op = extra[extra_index + work[sym]];
      here_val = base[base_index + work[sym]];
    }
    else {
      here_op = 32 + 64;         /* end of block */
      here_val = 0;
    }

    /* replicate for those indices with low len bits equal to huff */
    incr = 1 << (len - drop);
    fill = 1 << curr;
    min = fill;                 /* save offset to next table */
    do {
      fill -= incr;
      table[next + (huff >> drop) + fill] = (here_bits << 24) | (here_op << 16) | here_val |0;
    } while (fill !== 0);

    /* backwards increment the len-bit code huff */
    incr = 1 << (len - 1);
    while (huff & incr) {
      incr >>= 1;
    }
    if (incr !== 0) {
      huff &= incr - 1;
      huff += incr;
    } else {
      huff = 0;
    }

    /* go to next symbol, update count, len */
    sym++;
    if (--count[len] === 0) {
      if (len === max) { break; }
      len = lens[lens_index + work[sym]];
    }

    /* create new sub-table if needed */
    if (len > root && (huff & mask) !== low) {
      /* if first time, transition to sub-tables */
      if (drop === 0) {
        drop = root;
      }

      /* increment past last table */
      next += min;            /* here min is 1 << curr */

      /* determine length of next table */
      curr = len - drop;
      left = 1 << curr;
      while (curr + drop < max) {
        left -= count[curr + drop];
        if (left <= 0) { break; }
        curr++;
        left <<= 1;
      }

      /* check for enough space */
      used += 1 << curr;
      if ((type === LENS && used > ENOUGH_LENS) ||
        (type === DISTS && used > ENOUGH_DISTS)) {
        return 1;
      }

      /* point entry in root table to sub-table */
      low = huff & mask;
      /*table.op[low] = curr;
      table.bits[low] = root;
      table.val[low] = next - opts.table_index;*/
      table[low] = (root << 24) | (curr << 16) | (next - table_index) |0;
    }
  }

  /* fill in remaining table entry if code is incomplete (guaranteed to have
   at most one remaining entry, since if the code is incomplete, the
   maximum code length that was allowed to get this far is one bit) */
  if (huff !== 0) {
    //table.op[next + huff] = 64;            /* invalid code marker */
    //table.bits[next + huff] = len - drop;
    //table.val[next + huff] = 0;
    table[next + huff] = ((len - drop) << 24) | (64 << 16) |0;
  }

  /* set return parameters */
  //opts.table_index += used;
  opts.bits = root;
  return 0;
};

},{"../utils/common":30}],40:[function(require,module,exports){
'use strict';

module.exports = {
  '2':    'need dictionary',     /* Z_NEED_DICT       2  */
  '1':    'stream end',          /* Z_STREAM_END      1  */
  '0':    '',                    /* Z_OK              0  */
  '-1':   'file error',          /* Z_ERRNO         (-1) */
  '-2':   'stream error',        /* Z_STREAM_ERROR  (-2) */
  '-3':   'data error',          /* Z_DATA_ERROR    (-3) */
  '-4':   'insufficient memory', /* Z_MEM_ERROR     (-4) */
  '-5':   'buffer error',        /* Z_BUF_ERROR     (-5) */
  '-6':   'incompatible version' /* Z_VERSION_ERROR (-6) */
};

},{}],41:[function(require,module,exports){
'use strict';


var utils = require('../utils/common');

/* Public constants ==========================================================*/
/* ===========================================================================*/


//var Z_FILTERED          = 1;
//var Z_HUFFMAN_ONLY      = 2;
//var Z_RLE               = 3;
var Z_FIXED               = 4;
//var Z_DEFAULT_STRATEGY  = 0;

/* Possible values of the data_type field (though see inflate()) */
var Z_BINARY              = 0;
var Z_TEXT                = 1;
//var Z_ASCII             = 1; // = Z_TEXT
var Z_UNKNOWN             = 2;

/*============================================================================*/


function zero(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0; } }

// From zutil.h

var STORED_BLOCK = 0;
var STATIC_TREES = 1;
var DYN_TREES    = 2;
/* The three kinds of block type */

var MIN_MATCH    = 3;
var MAX_MATCH    = 258;
/* The minimum and maximum match lengths */

// From deflate.h
/* ===========================================================================
 * Internal compression state.
 */

var LENGTH_CODES  = 29;
/* number of length codes, not counting the special END_BLOCK code */

var LITERALS      = 256;
/* number of literal bytes 0..255 */

var L_CODES       = LITERALS + 1 + LENGTH_CODES;
/* number of Literal or Length codes, including the END_BLOCK code */

var D_CODES       = 30;
/* number of distance codes */

var BL_CODES      = 19;
/* number of codes used to transfer the bit lengths */

var HEAP_SIZE     = 2*L_CODES + 1;
/* maximum heap size */

var MAX_BITS      = 15;
/* All codes must not exceed MAX_BITS bits */

var Buf_size      = 16;
/* size of bit buffer in bi_buf */


/* ===========================================================================
 * Constants
 */

var MAX_BL_BITS = 7;
/* Bit length codes must not exceed MAX_BL_BITS bits */

var END_BLOCK   = 256;
/* end of block literal code */

var REP_3_6     = 16;
/* repeat previous bit length 3-6 times (2 bits of repeat count) */

var REPZ_3_10   = 17;
/* repeat a zero length 3-10 times  (3 bits of repeat count) */

var REPZ_11_138 = 18;
/* repeat a zero length 11-138 times  (7 bits of repeat count) */

var extra_lbits =   /* extra bits for each length code */
  [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];

var extra_dbits =   /* extra bits for each distance code */
  [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];

var extra_blbits =  /* extra bits for each bit length code */
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7];

var bl_order =
  [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
/* The lengths of the bit length codes are sent in order of decreasing
 * probability, to avoid transmitting the lengths for unused bit length codes.
 */

/* ===========================================================================
 * Local data. These are initialized only once.
 */

// We pre-fill arrays with 0 to avoid uninitialized gaps

var DIST_CODE_LEN = 512; /* see definition of array dist_code below */

// !!!! Use flat array insdead of structure, Freq = i*2, Len = i*2+1
var static_ltree  = new Array((L_CODES+2) * 2);
zero(static_ltree);
/* The static literal tree. Since the bit lengths are imposed, there is no
 * need for the L_CODES extra codes used during heap construction. However
 * The codes 286 and 287 are needed to build a canonical tree (see _tr_init
 * below).
 */

var static_dtree  = new Array(D_CODES * 2);
zero(static_dtree);
/* The static distance tree. (Actually a trivial tree since all codes use
 * 5 bits.)
 */

var _dist_code    = new Array(DIST_CODE_LEN);
zero(_dist_code);
/* Distance codes. The first 256 values correspond to the distances
 * 3 .. 258, the last 256 values correspond to the top 8 bits of
 * the 15 bit distances.
 */

var _length_code  = new Array(MAX_MATCH-MIN_MATCH+1);
zero(_length_code);
/* length code for each normalized match length (0 == MIN_MATCH) */

var base_length   = new Array(LENGTH_CODES);
zero(base_length);
/* First normalized length for each code (0 = MIN_MATCH) */

var base_dist     = new Array(D_CODES);
zero(base_dist);
/* First normalized distance for each code (0 = distance of 1) */


var StaticTreeDesc = function (static_tree, extra_bits, extra_base, elems, max_length) {

  this.static_tree  = static_tree;  /* static tree or NULL */
  this.extra_bits   = extra_bits;   /* extra bits for each code or NULL */
  this.extra_base   = extra_base;   /* base index for extra_bits */
  this.elems        = elems;        /* max number of elements in the tree */
  this.max_length   = max_length;   /* max bit length for the codes */

  // show if `static_tree` has data or dummy - needed for monomorphic objects
  this.has_stree    = static_tree && static_tree.length;
};


var static_l_desc;
var static_d_desc;
var static_bl_desc;


var TreeDesc = function(dyn_tree, stat_desc) {
  this.dyn_tree = dyn_tree;     /* the dynamic tree */
  this.max_code = 0;            /* largest code with non zero frequency */
  this.stat_desc = stat_desc;   /* the corresponding static tree */
};



function d_code(dist) {
  return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
}


/* ===========================================================================
 * Output a short LSB first on the stream.
 * IN assertion: there is enough room in pendingBuf.
 */
function put_short (s, w) {
//    put_byte(s, (uch)((w) & 0xff));
//    put_byte(s, (uch)((ush)(w) >> 8));
  s.pending_buf[s.pending++] = (w) & 0xff;
  s.pending_buf[s.pending++] = (w >>> 8) & 0xff;
}


/* ===========================================================================
 * Send a value on a given number of bits.
 * IN assertion: length <= 16 and value fits in length bits.
 */
function send_bits(s, value, length) {
  if (s.bi_valid > (Buf_size - length)) {
    s.bi_buf |= (value << s.bi_valid) & 0xffff;
    put_short(s, s.bi_buf);
    s.bi_buf = value >> (Buf_size - s.bi_valid);
    s.bi_valid += length - Buf_size;
  } else {
    s.bi_buf |= (value << s.bi_valid) & 0xffff;
    s.bi_valid += length;
  }
}


function send_code(s, c, tree) {
  send_bits(s, tree[c*2]/*.Code*/, tree[c*2 + 1]/*.Len*/);
}


/* ===========================================================================
 * Reverse the first len bits of a code, using straightforward code (a faster
 * method would use a table)
 * IN assertion: 1 <= len <= 15
 */
function bi_reverse(code, len) {
  var res = 0;
  do {
    res |= code & 1;
    code >>>= 1;
    res <<= 1;
  } while (--len > 0);
  return res >>> 1;
}


/* ===========================================================================
 * Flush the bit buffer, keeping at most 7 bits in it.
 */
function bi_flush(s) {
  if (s.bi_valid === 16) {
    put_short(s, s.bi_buf);
    s.bi_buf = 0;
    s.bi_valid = 0;

  } else if (s.bi_valid >= 8) {
    s.pending_buf[s.pending++] = s.bi_buf & 0xff;
    s.bi_buf >>= 8;
    s.bi_valid -= 8;
  }
}


/* ===========================================================================
 * Compute the optimal bit lengths for a tree and update the total bit length
 * for the current block.
 * IN assertion: the fields freq and dad are set, heap[heap_max] and
 *    above are the tree nodes sorted by increasing frequency.
 * OUT assertions: the field len is set to the optimal bit length, the
 *     array bl_count contains the frequencies for each bit length.
 *     The length opt_len is updated; static_len is also updated if stree is
 *     not null.
 */
function gen_bitlen(s, desc)
//    deflate_state *s;
//    tree_desc *desc;    /* the tree descriptor */
{
  var tree            = desc.dyn_tree;
  var max_code        = desc.max_code;
  var stree           = desc.stat_desc.static_tree;
  var has_stree       = desc.stat_desc.has_stree;
  var extra           = desc.stat_desc.extra_bits;
  var base            = desc.stat_desc.extra_base;
  var max_length      = desc.stat_desc.max_length;
  var h;              /* heap index */
  var n, m;           /* iterate over the tree elements */
  var bits;           /* bit length */
  var xbits;          /* extra bits */
  var f;              /* frequency */
  var overflow = 0;   /* number of elements with bit length too large */

  for (bits = 0; bits <= MAX_BITS; bits++) {
    s.bl_count[bits] = 0;
  }

  /* In a first pass, compute the optimal bit lengths (which may
   * overflow in the case of the bit length tree).
   */
  tree[s.heap[s.heap_max]*2 + 1]/*.Len*/ = 0; /* root of the heap */

  for (h = s.heap_max+1; h < HEAP_SIZE; h++) {
    n = s.heap[h];
    bits = tree[tree[n*2 +1]/*.Dad*/ * 2 + 1]/*.Len*/ + 1;
    if (bits > max_length) {
      bits = max_length;
      overflow++;
    }
    tree[n*2 + 1]/*.Len*/ = bits;
    /* We overwrite tree[n].Dad which is no longer needed */

    if (n > max_code) { continue; } /* not a leaf node */

    s.bl_count[bits]++;
    xbits = 0;
    if (n >= base) {
      xbits = extra[n-base];
    }
    f = tree[n * 2]/*.Freq*/;
    s.opt_len += f * (bits + xbits);
    if (has_stree) {
      s.static_len += f * (stree[n*2 + 1]/*.Len*/ + xbits);
    }
  }
  if (overflow === 0) { return; }

  // Trace((stderr,"\nbit length overflow\n"));
  /* This happens for example on obj2 and pic of the Calgary corpus */

  /* Find the first bit length which could increase: */
  do {
    bits = max_length-1;
    while (s.bl_count[bits] === 0) { bits--; }
    s.bl_count[bits]--;      /* move one leaf down the tree */
    s.bl_count[bits+1] += 2; /* move one overflow item as its brother */
    s.bl_count[max_length]--;
    /* The brother of the overflow item also moves one step up,
     * but this does not affect bl_count[max_length]
     */
    overflow -= 2;
  } while (overflow > 0);

  /* Now recompute all bit lengths, scanning in increasing frequency.
   * h is still equal to HEAP_SIZE. (It is simpler to reconstruct all
   * lengths instead of fixing only the wrong ones. This idea is taken
   * from 'ar' written by Haruhiko Okumura.)
   */
  for (bits = max_length; bits !== 0; bits--) {
    n = s.bl_count[bits];
    while (n !== 0) {
      m = s.heap[--h];
      if (m > max_code) { continue; }
      if (tree[m*2 + 1]/*.Len*/ !== bits) {
        // Trace((stderr,"code %d bits %d->%d\n", m, tree[m].Len, bits));
        s.opt_len += (bits - tree[m*2 + 1]/*.Len*/)*tree[m*2]/*.Freq*/;
        tree[m*2 + 1]/*.Len*/ = bits;
      }
      n--;
    }
  }
}


/* ===========================================================================
 * Generate the codes for a given tree and bit counts (which need not be
 * optimal).
 * IN assertion: the array bl_count contains the bit length statistics for
 * the given tree and the field len is set for all tree elements.
 * OUT assertion: the field code is set for all tree elements of non
 *     zero code length.
 */
function gen_codes(tree, max_code, bl_count)
//    ct_data *tree;             /* the tree to decorate */
//    int max_code;              /* largest code with non zero frequency */
//    ushf *bl_count;            /* number of codes at each bit length */
{
  var next_code = new Array(MAX_BITS+1); /* next code value for each bit length */
  var code = 0;              /* running code value */
  var bits;                  /* bit index */
  var n;                     /* code index */

  /* The distribution counts are first used to generate the code values
   * without bit reversal.
   */
  for (bits = 1; bits <= MAX_BITS; bits++) {
    next_code[bits] = code = (code + bl_count[bits-1]) << 1;
  }
  /* Check that the bit counts in bl_count are consistent. The last code
   * must be all ones.
   */
  //Assert (code + bl_count[MAX_BITS]-1 == (1<<MAX_BITS)-1,
  //        "inconsistent bit counts");
  //Tracev((stderr,"\ngen_codes: max_code %d ", max_code));

  for (n = 0;  n <= max_code; n++) {
    var len = tree[n*2 + 1]/*.Len*/;
    if (len === 0) { continue; }
    /* Now reverse the bits */
    tree[n*2]/*.Code*/ = bi_reverse(next_code[len]++, len);

    //Tracecv(tree != static_ltree, (stderr,"\nn %3d %c l %2d c %4x (%x) ",
    //     n, (isgraph(n) ? n : ' '), len, tree[n].Code, next_code[len]-1));
  }
}


/* ===========================================================================
 * Initialize the various 'constant' tables.
 */
function tr_static_init() {
  var n;        /* iterates over tree elements */
  var bits;     /* bit counter */
  var length;   /* length value */
  var code;     /* code value */
  var dist;     /* distance index */
  var bl_count = new Array(MAX_BITS+1);
  /* number of codes at each bit length for an optimal tree */

  // do check in _tr_init()
  //if (static_init_done) return;

  /* For some embedded targets, global variables are not initialized: */
/*#ifdef NO_INIT_GLOBAL_POINTERS
  static_l_desc.static_tree = static_ltree;
  static_l_desc.extra_bits = extra_lbits;
  static_d_desc.static_tree = static_dtree;
  static_d_desc.extra_bits = extra_dbits;
  static_bl_desc.extra_bits = extra_blbits;
#endif*/

  /* Initialize the mapping length (0..255) -> length code (0..28) */
  length = 0;
  for (code = 0; code < LENGTH_CODES-1; code++) {
    base_length[code] = length;
    for (n = 0; n < (1<<extra_lbits[code]); n++) {
      _length_code[length++] = code;
    }
  }
  //Assert (length == 256, "tr_static_init: length != 256");
  /* Note that the length 255 (match length 258) can be represented
   * in two different ways: code 284 + 5 bits or code 285, so we
   * overwrite length_code[255] to use the best encoding:
   */
  _length_code[length-1] = code;

  /* Initialize the mapping dist (0..32K) -> dist code (0..29) */
  dist = 0;
  for (code = 0 ; code < 16; code++) {
    base_dist[code] = dist;
    for (n = 0; n < (1<<extra_dbits[code]); n++) {
      _dist_code[dist++] = code;
    }
  }
  //Assert (dist == 256, "tr_static_init: dist != 256");
  dist >>= 7; /* from now on, all distances are divided by 128 */
  for (; code < D_CODES; code++) {
    base_dist[code] = dist << 7;
    for (n = 0; n < (1<<(extra_dbits[code]-7)); n++) {
      _dist_code[256 + dist++] = code;
    }
  }
  //Assert (dist == 256, "tr_static_init: 256+dist != 512");

  /* Construct the codes of the static literal tree */
  for (bits = 0; bits <= MAX_BITS; bits++) {
    bl_count[bits] = 0;
  }

  n = 0;
  while (n <= 143) {
    static_ltree[n*2 + 1]/*.Len*/ = 8;
    n++;
    bl_count[8]++;
  }
  while (n <= 255) {
    static_ltree[n*2 + 1]/*.Len*/ = 9;
    n++;
    bl_count[9]++;
  }
  while (n <= 279) {
    static_ltree[n*2 + 1]/*.Len*/ = 7;
    n++;
    bl_count[7]++;
  }
  while (n <= 287) {
    static_ltree[n*2 + 1]/*.Len*/ = 8;
    n++;
    bl_count[8]++;
  }
  /* Codes 286 and 287 do not exist, but we must include them in the
   * tree construction to get a canonical Huffman tree (longest code
   * all ones)
   */
  gen_codes(static_ltree, L_CODES+1, bl_count);

  /* The static distance tree is trivial: */
  for (n = 0; n < D_CODES; n++) {
    static_dtree[n*2 + 1]/*.Len*/ = 5;
    static_dtree[n*2]/*.Code*/ = bi_reverse(n, 5);
  }

  // Now data ready and we can init static trees
  static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS+1, L_CODES, MAX_BITS);
  static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0,          D_CODES, MAX_BITS);
  static_bl_desc =new StaticTreeDesc(new Array(0), extra_blbits, 0,         BL_CODES, MAX_BL_BITS);

  //static_init_done = true;
}


/* ===========================================================================
 * Initialize a new block.
 */
function init_block(s) {
  var n; /* iterates over tree elements */

  /* Initialize the trees. */
  for (n = 0; n < L_CODES;  n++) { s.dyn_ltree[n*2]/*.Freq*/ = 0; }
  for (n = 0; n < D_CODES;  n++) { s.dyn_dtree[n*2]/*.Freq*/ = 0; }
  for (n = 0; n < BL_CODES; n++) { s.bl_tree[n*2]/*.Freq*/ = 0; }

  s.dyn_ltree[END_BLOCK*2]/*.Freq*/ = 1;
  s.opt_len = s.static_len = 0;
  s.last_lit = s.matches = 0;
}


/* ===========================================================================
 * Flush the bit buffer and align the output on a byte boundary
 */
function bi_windup(s)
{
  if (s.bi_valid > 8) {
    put_short(s, s.bi_buf);
  } else if (s.bi_valid > 0) {
    //put_byte(s, (Byte)s->bi_buf);
    s.pending_buf[s.pending++] = s.bi_buf;
  }
  s.bi_buf = 0;
  s.bi_valid = 0;
}

/* ===========================================================================
 * Copy a stored block, storing first the length and its
 * one's complement if requested.
 */
function copy_block(s, buf, len, header)
//DeflateState *s;
//charf    *buf;    /* the input data */
//unsigned len;     /* its length */
//int      header;  /* true if block header must be written */
{
  bi_windup(s);        /* align on byte boundary */

  if (header) {
    put_short(s, len);
    put_short(s, ~len);
  }
//  while (len--) {
//    put_byte(s, *buf++);
//  }
  utils.arraySet(s.pending_buf, s.window, buf, len, s.pending);
  s.pending += len;
}

/* ===========================================================================
 * Compares to subtrees, using the tree depth as tie breaker when
 * the subtrees have equal frequency. This minimizes the worst case length.
 */
function smaller(tree, n, m, depth) {
  var _n2 = n*2;
  var _m2 = m*2;
  return (tree[_n2]/*.Freq*/ < tree[_m2]/*.Freq*/ ||
         (tree[_n2]/*.Freq*/ === tree[_m2]/*.Freq*/ && depth[n] <= depth[m]));
}

/* ===========================================================================
 * Restore the heap property by moving down the tree starting at node k,
 * exchanging a node with the smallest of its two sons if necessary, stopping
 * when the heap property is re-established (each father smaller than its
 * two sons).
 */
function pqdownheap(s, tree, k)
//    deflate_state *s;
//    ct_data *tree;  /* the tree to restore */
//    int k;               /* node to move down */
{
  var v = s.heap[k];
  var j = k << 1;  /* left son of k */
  while (j <= s.heap_len) {
    /* Set j to the smallest of the two sons: */
    if (j < s.heap_len &&
      smaller(tree, s.heap[j+1], s.heap[j], s.depth)) {
      j++;
    }
    /* Exit if v is smaller than both sons */
    if (smaller(tree, v, s.heap[j], s.depth)) { break; }

    /* Exchange v with the smallest son */
    s.heap[k] = s.heap[j];
    k = j;

    /* And continue down the tree, setting j to the left son of k */
    j <<= 1;
  }
  s.heap[k] = v;
}


// inlined manually
// var SMALLEST = 1;

/* ===========================================================================
 * Send the block data compressed using the given Huffman trees
 */
function compress_block(s, ltree, dtree)
//    deflate_state *s;
//    const ct_data *ltree; /* literal tree */
//    const ct_data *dtree; /* distance tree */
{
  var dist;           /* distance of matched string */
  var lc;             /* match length or unmatched char (if dist == 0) */
  var lx = 0;         /* running index in l_buf */
  var code;           /* the code to send */
  var extra;          /* number of extra bits to send */

  if (s.last_lit !== 0) {
    do {
      dist = (s.pending_buf[s.d_buf + lx*2] << 8) | (s.pending_buf[s.d_buf + lx*2 + 1]);
      lc = s.pending_buf[s.l_buf + lx];
      lx++;

      if (dist === 0) {
        send_code(s, lc, ltree); /* send a literal byte */
        //Tracecv(isgraph(lc), (stderr," '%c' ", lc));
      } else {
        /* Here, lc is the match length - MIN_MATCH */
        code = _length_code[lc];
        send_code(s, code+LITERALS+1, ltree); /* send the length code */
        extra = extra_lbits[code];
        if (extra !== 0) {
          lc -= base_length[code];
          send_bits(s, lc, extra);       /* send the extra length bits */
        }
        dist--; /* dist is now the match distance - 1 */
        code = d_code(dist);
        //Assert (code < D_CODES, "bad d_code");

        send_code(s, code, dtree);       /* send the distance code */
        extra = extra_dbits[code];
        if (extra !== 0) {
          dist -= base_dist[code];
          send_bits(s, dist, extra);   /* send the extra distance bits */
        }
      } /* literal or match pair ? */

      /* Check that the overlay between pending_buf and d_buf+l_buf is ok: */
      //Assert((uInt)(s->pending) < s->lit_bufsize + 2*lx,
      //       "pendingBuf overflow");

    } while (lx < s.last_lit);
  }

  send_code(s, END_BLOCK, ltree);
}


/* ===========================================================================
 * Construct one Huffman tree and assigns the code bit strings and lengths.
 * Update the total bit length for the current block.
 * IN assertion: the field freq is set for all tree elements.
 * OUT assertions: the fields len and code are set to the optimal bit length
 *     and corresponding code. The length opt_len is updated; static_len is
 *     also updated if stree is not null. The field max_code is set.
 */
function build_tree(s, desc)
//    deflate_state *s;
//    tree_desc *desc; /* the tree descriptor */
{
  var tree     = desc.dyn_tree;
  var stree    = desc.stat_desc.static_tree;
  var has_stree = desc.stat_desc.has_stree;
  var elems    = desc.stat_desc.elems;
  var n, m;          /* iterate over heap elements */
  var max_code = -1; /* largest code with non zero frequency */
  var node;          /* new node being created */

  /* Construct the initial heap, with least frequent element in
   * heap[SMALLEST]. The sons of heap[n] are heap[2*n] and heap[2*n+1].
   * heap[0] is not used.
   */
  s.heap_len = 0;
  s.heap_max = HEAP_SIZE;

  for (n = 0; n < elems; n++) {
    if (tree[n * 2]/*.Freq*/ !== 0) {
      s.heap[++s.heap_len] = max_code = n;
      s.depth[n] = 0;

    } else {
      tree[n*2 + 1]/*.Len*/ = 0;
    }
  }

  /* The pkzip format requires that at least one distance code exists,
   * and that at least one bit should be sent even if there is only one
   * possible code. So to avoid special checks later on we force at least
   * two codes of non zero frequency.
   */
  while (s.heap_len < 2) {
    node = s.heap[++s.heap_len] = (max_code < 2 ? ++max_code : 0);
    tree[node * 2]/*.Freq*/ = 1;
    s.depth[node] = 0;
    s.opt_len--;

    if (has_stree) {
      s.static_len -= stree[node*2 + 1]/*.Len*/;
    }
    /* node is 0 or 1 so it does not have extra bits */
  }
  desc.max_code = max_code;

  /* The elements heap[heap_len/2+1 .. heap_len] are leaves of the tree,
   * establish sub-heaps of increasing lengths:
   */
  for (n = (s.heap_len >> 1/*int /2*/); n >= 1; n--) { pqdownheap(s, tree, n); }

  /* Construct the Huffman tree by repeatedly combining the least two
   * frequent nodes.
   */
  node = elems;              /* next internal node of the tree */
  do {
    //pqremove(s, tree, n);  /* n = node of least frequency */
    /*** pqremove ***/
    n = s.heap[1/*SMALLEST*/];
    s.heap[1/*SMALLEST*/] = s.heap[s.heap_len--];
    pqdownheap(s, tree, 1/*SMALLEST*/);
    /***/

    m = s.heap[1/*SMALLEST*/]; /* m = node of next least frequency */

    s.heap[--s.heap_max] = n; /* keep the nodes sorted by frequency */
    s.heap[--s.heap_max] = m;

    /* Create a new node father of n and m */
    tree[node * 2]/*.Freq*/ = tree[n * 2]/*.Freq*/ + tree[m * 2]/*.Freq*/;
    s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
    tree[n*2 + 1]/*.Dad*/ = tree[m*2 + 1]/*.Dad*/ = node;

    /* and insert the new node in the heap */
    s.heap[1/*SMALLEST*/] = node++;
    pqdownheap(s, tree, 1/*SMALLEST*/);

  } while (s.heap_len >= 2);

  s.heap[--s.heap_max] = s.heap[1/*SMALLEST*/];

  /* At this point, the fields freq and dad are set. We can now
   * generate the bit lengths.
   */
  gen_bitlen(s, desc);

  /* The field len is now set, we can generate the bit codes */
  gen_codes(tree, max_code, s.bl_count);
}


/* ===========================================================================
 * Scan a literal or distance tree to determine the frequencies of the codes
 * in the bit length tree.
 */
function scan_tree(s, tree, max_code)
//    deflate_state *s;
//    ct_data *tree;   /* the tree to be scanned */
//    int max_code;    /* and its largest code of non zero frequency */
{
  var n;                     /* iterates over all tree elements */
  var prevlen = -1;          /* last emitted length */
  var curlen;                /* length of current code */

  var nextlen = tree[0*2 + 1]/*.Len*/; /* length of next code */

  var count = 0;             /* repeat count of the current code */
  var max_count = 7;         /* max repeat count */
  var min_count = 4;         /* min repeat count */

  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }
  tree[(max_code+1)*2 + 1]/*.Len*/ = 0xffff; /* guard */

  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n+1)*2 + 1]/*.Len*/;

    if (++count < max_count && curlen === nextlen) {
      continue;

    } else if (count < min_count) {
      s.bl_tree[curlen * 2]/*.Freq*/ += count;

    } else if (curlen !== 0) {

      if (curlen !== prevlen) { s.bl_tree[curlen * 2]/*.Freq*/++; }
      s.bl_tree[REP_3_6*2]/*.Freq*/++;

    } else if (count <= 10) {
      s.bl_tree[REPZ_3_10*2]/*.Freq*/++;

    } else {
      s.bl_tree[REPZ_11_138*2]/*.Freq*/++;
    }

    count = 0;
    prevlen = curlen;

    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;

    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;

    } else {
      max_count = 7;
      min_count = 4;
    }
  }
}


/* ===========================================================================
 * Send a literal or distance tree in compressed form, using the codes in
 * bl_tree.
 */
function send_tree(s, tree, max_code)
//    deflate_state *s;
//    ct_data *tree; /* the tree to be scanned */
//    int max_code;       /* and its largest code of non zero frequency */
{
  var n;                     /* iterates over all tree elements */
  var prevlen = -1;          /* last emitted length */
  var curlen;                /* length of current code */

  var nextlen = tree[0*2 + 1]/*.Len*/; /* length of next code */

  var count = 0;             /* repeat count of the current code */
  var max_count = 7;         /* max repeat count */
  var min_count = 4;         /* min repeat count */

  /* tree[max_code+1].Len = -1; */  /* guard already set */
  if (nextlen === 0) {
    max_count = 138;
    min_count = 3;
  }

  for (n = 0; n <= max_code; n++) {
    curlen = nextlen;
    nextlen = tree[(n+1)*2 + 1]/*.Len*/;

    if (++count < max_count && curlen === nextlen) {
      continue;

    } else if (count < min_count) {
      do { send_code(s, curlen, s.bl_tree); } while (--count !== 0);

    } else if (curlen !== 0) {
      if (curlen !== prevlen) {
        send_code(s, curlen, s.bl_tree);
        count--;
      }
      //Assert(count >= 3 && count <= 6, " 3_6?");
      send_code(s, REP_3_6, s.bl_tree);
      send_bits(s, count-3, 2);

    } else if (count <= 10) {
      send_code(s, REPZ_3_10, s.bl_tree);
      send_bits(s, count-3, 3);

    } else {
      send_code(s, REPZ_11_138, s.bl_tree);
      send_bits(s, count-11, 7);
    }

    count = 0;
    prevlen = curlen;
    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;

    } else if (curlen === nextlen) {
      max_count = 6;
      min_count = 3;

    } else {
      max_count = 7;
      min_count = 4;
    }
  }
}


/* ===========================================================================
 * Construct the Huffman tree for the bit lengths and return the index in
 * bl_order of the last bit length code to send.
 */
function build_bl_tree(s) {
  var max_blindex;  /* index of last bit length code of non zero freq */

  /* Determine the bit length frequencies for literal and distance trees */
  scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
  scan_tree(s, s.dyn_dtree, s.d_desc.max_code);

  /* Build the bit length tree: */
  build_tree(s, s.bl_desc);
  /* opt_len now includes the length of the tree representations, except
   * the lengths of the bit lengths codes and the 5+5+4 bits for the counts.
   */

  /* Determine the number of bit length codes to send. The pkzip format
   * requires that at least 4 bit length codes be sent. (appnote.txt says
   * 3 but the actual value used is 4.)
   */
  for (max_blindex = BL_CODES-1; max_blindex >= 3; max_blindex--) {
    if (s.bl_tree[bl_order[max_blindex]*2 + 1]/*.Len*/ !== 0) {
      break;
    }
  }
  /* Update opt_len to include the bit length tree and counts */
  s.opt_len += 3*(max_blindex+1) + 5+5+4;
  //Tracev((stderr, "\ndyn trees: dyn %ld, stat %ld",
  //        s->opt_len, s->static_len));

  return max_blindex;
}


/* ===========================================================================
 * Send the header for a block using dynamic Huffman trees: the counts, the
 * lengths of the bit length codes, the literal tree and the distance tree.
 * IN assertion: lcodes >= 257, dcodes >= 1, blcodes >= 4.
 */
function send_all_trees(s, lcodes, dcodes, blcodes)
//    deflate_state *s;
//    int lcodes, dcodes, blcodes; /* number of codes for each tree */
{
  var rank;                    /* index in bl_order */

  //Assert (lcodes >= 257 && dcodes >= 1 && blcodes >= 4, "not enough codes");
  //Assert (lcodes <= L_CODES && dcodes <= D_CODES && blcodes <= BL_CODES,
  //        "too many codes");
  //Tracev((stderr, "\nbl counts: "));
  send_bits(s, lcodes-257, 5); /* not +255 as stated in appnote.txt */
  send_bits(s, dcodes-1,   5);
  send_bits(s, blcodes-4,  4); /* not -3 as stated in appnote.txt */
  for (rank = 0; rank < blcodes; rank++) {
    //Tracev((stderr, "\nbl code %2d ", bl_order[rank]));
    send_bits(s, s.bl_tree[bl_order[rank]*2 + 1]/*.Len*/, 3);
  }
  //Tracev((stderr, "\nbl tree: sent %ld", s->bits_sent));

  send_tree(s, s.dyn_ltree, lcodes-1); /* literal tree */
  //Tracev((stderr, "\nlit tree: sent %ld", s->bits_sent));

  send_tree(s, s.dyn_dtree, dcodes-1); /* distance tree */
  //Tracev((stderr, "\ndist tree: sent %ld", s->bits_sent));
}


/* ===========================================================================
 * Check if the data type is TEXT or BINARY, using the following algorithm:
 * - TEXT if the two conditions below are satisfied:
 *    a) There are no non-portable control characters belonging to the
 *       "black list" (0..6, 14..25, 28..31).
 *    b) There is at least one printable character belonging to the
 *       "white list" (9 {TAB}, 10 {LF}, 13 {CR}, 32..255).
 * - BINARY otherwise.
 * - The following partially-portable control characters form a
 *   "gray list" that is ignored in this detection algorithm:
 *   (7 {BEL}, 8 {BS}, 11 {VT}, 12 {FF}, 26 {SUB}, 27 {ESC}).
 * IN assertion: the fields Freq of dyn_ltree are set.
 */
function detect_data_type(s) {
  /* black_mask is the bit mask of black-listed bytes
   * set bits 0..6, 14..25, and 28..31
   * 0xf3ffc07f = binary 11110011111111111100000001111111
   */
  var black_mask = 0xf3ffc07f;
  var n;

  /* Check for non-textual ("black-listed") bytes. */
  for (n = 0; n <= 31; n++, black_mask >>>= 1) {
    if ((black_mask & 1) && (s.dyn_ltree[n*2]/*.Freq*/ !== 0)) {
      return Z_BINARY;
    }
  }

  /* Check for textual ("white-listed") bytes. */
  if (s.dyn_ltree[9 * 2]/*.Freq*/ !== 0 || s.dyn_ltree[10 * 2]/*.Freq*/ !== 0 ||
      s.dyn_ltree[13 * 2]/*.Freq*/ !== 0) {
    return Z_TEXT;
  }
  for (n = 32; n < LITERALS; n++) {
    if (s.dyn_ltree[n * 2]/*.Freq*/ !== 0) {
      return Z_TEXT;
    }
  }

  /* There are no "black-listed" or "white-listed" bytes:
   * this stream either is empty or has tolerated ("gray-listed") bytes only.
   */
  return Z_BINARY;
}


var static_init_done = false;

/* ===========================================================================
 * Initialize the tree data structures for a new zlib stream.
 */
function _tr_init(s)
{

  if (!static_init_done) {
    tr_static_init();
    static_init_done = true;
  }

  s.l_desc  = new TreeDesc(s.dyn_ltree, static_l_desc);
  s.d_desc  = new TreeDesc(s.dyn_dtree, static_d_desc);
  s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);

  s.bi_buf = 0;
  s.bi_valid = 0;

  /* Initialize the first block of the first file: */
  init_block(s);
}


/* ===========================================================================
 * Send a stored block
 */
function _tr_stored_block(s, buf, stored_len, last)
//DeflateState *s;
//charf *buf;       /* input block */
//ulg stored_len;   /* length of input block */
//int last;         /* one if this is the last block for a file */
{
  send_bits(s, (STORED_BLOCK<<1)+(last ? 1 : 0), 3);    /* send block type */
  copy_block(s, buf, stored_len, true); /* with header */
}


/* ===========================================================================
 * Send one empty static block to give enough lookahead for inflate.
 * This takes 10 bits, of which 7 may remain in the bit buffer.
 */
function _tr_align(s) {
  send_bits(s, STATIC_TREES<<1, 3);
  send_code(s, END_BLOCK, static_ltree);
  bi_flush(s);
}


/* ===========================================================================
 * Determine the best encoding for the current block: dynamic trees, static
 * trees or store, and output the encoded block to the zip file.
 */
function _tr_flush_block(s, buf, stored_len, last)
//DeflateState *s;
//charf *buf;       /* input block, or NULL if too old */
//ulg stored_len;   /* length of input block */
//int last;         /* one if this is the last block for a file */
{
  var opt_lenb, static_lenb;  /* opt_len and static_len in bytes */
  var max_blindex = 0;        /* index of last bit length code of non zero freq */

  /* Build the Huffman trees unless a stored block is forced */
  if (s.level > 0) {

    /* Check if the file is binary or text */
    if (s.strm.data_type === Z_UNKNOWN) {
      s.strm.data_type = detect_data_type(s);
    }

    /* Construct the literal and distance trees */
    build_tree(s, s.l_desc);
    // Tracev((stderr, "\nlit data: dyn %ld, stat %ld", s->opt_len,
    //        s->static_len));

    build_tree(s, s.d_desc);
    // Tracev((stderr, "\ndist data: dyn %ld, stat %ld", s->opt_len,
    //        s->static_len));
    /* At this point, opt_len and static_len are the total bit lengths of
     * the compressed block data, excluding the tree representations.
     */

    /* Build the bit length tree for the above two trees, and get the index
     * in bl_order of the last bit length code to send.
     */
    max_blindex = build_bl_tree(s);

    /* Determine the best encoding. Compute the block lengths in bytes. */
    opt_lenb = (s.opt_len+3+7) >>> 3;
    static_lenb = (s.static_len+3+7) >>> 3;

    // Tracev((stderr, "\nopt %lu(%lu) stat %lu(%lu) stored %lu lit %u ",
    //        opt_lenb, s->opt_len, static_lenb, s->static_len, stored_len,
    //        s->last_lit));

    if (static_lenb <= opt_lenb) { opt_lenb = static_lenb; }

  } else {
    // Assert(buf != (char*)0, "lost buf");
    opt_lenb = static_lenb = stored_len + 5; /* force a stored block */
  }

  if ((stored_len+4 <= opt_lenb) && (buf !== -1)) {
    /* 4: two words for the lengths */

    /* The test buf != NULL is only necessary if LIT_BUFSIZE > WSIZE.
     * Otherwise we can't have processed more than WSIZE input bytes since
     * the last block flush, because compression would have been
     * successful. If LIT_BUFSIZE <= WSIZE, it is never too late to
     * transform a block into a stored block.
     */
    _tr_stored_block(s, buf, stored_len, last);

  } else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) {

    send_bits(s, (STATIC_TREES<<1) + (last ? 1 : 0), 3);
    compress_block(s, static_ltree, static_dtree);

  } else {
    send_bits(s, (DYN_TREES<<1) + (last ? 1 : 0), 3);
    send_all_trees(s, s.l_desc.max_code+1, s.d_desc.max_code+1, max_blindex+1);
    compress_block(s, s.dyn_ltree, s.dyn_dtree);
  }
  // Assert (s->compressed_len == s->bits_sent, "bad compressed size");
  /* The above check is made mod 2^32, for files larger than 512 MB
   * and uLong implemented on 32 bits.
   */
  init_block(s);

  if (last) {
    bi_windup(s);
  }
  // Tracev((stderr,"\ncomprlen %lu(%lu) ", s->compressed_len>>3,
  //       s->compressed_len-7*last));
}

/* ===========================================================================
 * Save the match info and tally the frequency counts. Return true if
 * the current block must be flushed.
 */
function _tr_tally(s, dist, lc)
//    deflate_state *s;
//    unsigned dist;  /* distance of matched string */
//    unsigned lc;    /* match length-MIN_MATCH or unmatched char (if dist==0) */
{
  //var out_length, in_length, dcode;

  s.pending_buf[s.d_buf + s.last_lit * 2]     = (dist >>> 8) & 0xff;
  s.pending_buf[s.d_buf + s.last_lit * 2 + 1] = dist & 0xff;

  s.pending_buf[s.l_buf + s.last_lit] = lc & 0xff;
  s.last_lit++;

  if (dist === 0) {
    /* lc is the unmatched char */
    s.dyn_ltree[lc*2]/*.Freq*/++;
  } else {
    s.matches++;
    /* Here, lc is the match length - MIN_MATCH */
    dist--;             /* dist = match distance - 1 */
    //Assert((ush)dist < (ush)MAX_DIST(s) &&
    //       (ush)lc <= (ush)(MAX_MATCH-MIN_MATCH) &&
    //       (ush)d_code(dist) < (ush)D_CODES,  "_tr_tally: bad match");

    s.dyn_ltree[(_length_code[lc]+LITERALS+1) * 2]/*.Freq*/++;
    s.dyn_dtree[d_code(dist) * 2]/*.Freq*/++;
  }

// (!) This block is disabled in zlib defailts,
// don't enable it for binary compatibility

//#ifdef TRUNCATE_BLOCK
//  /* Try to guess if it is profitable to stop the current block here */
//  if ((s.last_lit & 0x1fff) === 0 && s.level > 2) {
//    /* Compute an upper bound for the compressed length */
//    out_length = s.last_lit*8;
//    in_length = s.strstart - s.block_start;
//
//    for (dcode = 0; dcode < D_CODES; dcode++) {
//      out_length += s.dyn_dtree[dcode*2]/*.Freq*/ * (5 + extra_dbits[dcode]);
//    }
//    out_length >>>= 3;
//    //Tracev((stderr,"\nlast_lit %u, in %ld, out ~%ld(%ld%%) ",
//    //       s->last_lit, in_length, out_length,
//    //       100L - out_length*100L/in_length));
//    if (s.matches < (s.last_lit>>1)/*int /2*/ && out_length < (in_length>>1)/*int /2*/) {
//      return true;
//    }
//  }
//#endif

  return (s.last_lit === s.lit_bufsize-1);
  /* We avoid equality with lit_bufsize because of wraparound at 64K
   * on 16 bit machines and because stored blocks are restricted to
   * 64K-1 bytes.
   */
}

exports._tr_init  = _tr_init;
exports._tr_stored_block = _tr_stored_block;
exports._tr_flush_block  = _tr_flush_block;
exports._tr_tally = _tr_tally;
exports._tr_align = _tr_align;

},{"../utils/common":30}],42:[function(require,module,exports){
'use strict';


function ZStream() {
  /* next input byte */
  this.input = null; // JS specific, because we have no pointers
  this.next_in = 0;
  /* number of bytes available at input */
  this.avail_in = 0;
  /* total number of input bytes read so far */
  this.total_in = 0;
  /* next output byte should be put there */
  this.output = null; // JS specific, because we have no pointers
  this.next_out = 0;
  /* remaining free space at output */
  this.avail_out = 0;
  /* total number of bytes output so far */
  this.total_out = 0;
  /* last error message, NULL if no error */
  this.msg = ''/*Z_NULL*/;
  /* not visible by applications */
  this.state = null;
  /* best guess about the data type: binary or text */
  this.data_type = 2/*Z_UNKNOWN*/;
  /* adler32 value of the uncompressed data */
  this.adler = 0;
}

module.exports = ZStream;

},{}],43:[function(require,module,exports){
// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    "use strict";

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object" && typeof module === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else if (typeof window !== "undefined" || typeof self !== "undefined") {
        // Prefer window over self for add-on scripts. Use self for
        // non-windowed contexts.
        var global = typeof window !== "undefined" ? window : self;

        // Get the `window` object, save the previous Q global
        // and initialize Q as a global.
        var previousQ = global.Q;
        global.Q = definition();

        // Add a noConflict function so Q can be removed from the
        // global namespace.
        global.Q.noConflict = function () {
            global.Q = previousQ;
            return this;
        };

    } else {
        throw new Error("This environment was not anticipated by Q. Please file a bug.");
    }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;
    // queue for late tasks, used by unhandled rejection tracking
    var laterQueue = [];

    function flush() {
        /* jshint loopfunc: true */
        var task, domain;

        while (head.next) {
            head = head.next;
            task = head.task;
            head.task = void 0;
            domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }
            runSingle(task, domain);

        }
        while (laterQueue.length) {
            task = laterQueue.pop();
            runSingle(task);
        }
        flushing = false;
    }
    // runs a single function in the async queue
    function runSingle(task, domain) {
        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them synchronously to interrupt flushing!

                // Ensure continuation if the uncaught exception is suppressed
                // listening "uncaughtException" events (as domains does).
                // Continue in next event to avoid tick recursion.
                if (domain) {
                    domain.exit();
                }
                setTimeout(flush, 0);
                if (domain) {
                    domain.enter();
                }

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function () {
                    throw e;
                }, 0);
            }
        }

        if (domain) {
            domain.exit();
        }
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process === "object" &&
        process.toString() === "[object process]" && process.nextTick) {
        // Ensure Q is in a real Node environment, with a `process.nextTick`.
        // To see through fake Node environments:
        // * Mocha test runner - exposes a `process` global without a `nextTick`
        // * Browserify - exposes a `process.nexTick` function that uses
        //   `setTimeout`. In this case `setImmediate` is preferred because
        //    it is faster. Browserify's `process.toString()` yields
        //   "[object Object]", while in a real Node environment
        //   `process.nextTick()` yields "[object process]".
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
        // working message ports the first time a page loads.
        channel.port1.onmessage = function () {
            requestTick = requestPortTick;
            channel.port1.onmessage = flush;
            flush();
        };
        var requestPortTick = function () {
            // Opera requires us to provide a message payload, regardless of
            // whether we use it.
            channel.port2.postMessage(0);
        };
        requestTick = function () {
            setTimeout(flush, 0);
            requestPortTick();
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }
    // runs a task after all other tasks have been run
    // this is useful for unhandled rejection tracking that needs to happen
    // after all `then`d tasks have been run.
    nextTick.runAfter = function (task) {
        laterQueue.push(task);
        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };
    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this **might** have the nice side-effect of reducing the size of
// the minified code by reducing x.call() to merely x()
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack &&
        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack) {
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        error.stack = filterStackString(concatedStacks);
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (value instanceof Promise) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

// enable long stacks if Q_DEBUG is set
if (typeof process === "object" && process && process.env && process.env.Q_DEBUG) {
    Q.longStackSupport = true;
}

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            Q.nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    };

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;
        promise.source = newPromise;

        array_reduce(messages, function (undefined, message) {
            Q.nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            Q.nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.Promise = promise; // ES6
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

promise.race = race; // ES6
promise.all = all; // ES6
promise.reject = reject; // ES6
promise.resolve = Q; // ES6

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become settled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be settled
 */
Q.race = race;
function race(answerPs) {
    return promise(function (resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function (answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        };
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    Q.nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

Q.tap = function (promise, callback) {
    return Q(promise).tap(callback);
};

/**
 * Works almost like "finally", but not called for rejections.
 * Original resolution value is passed through callback unaffected.
 * Callback may return a promise that will be awaited for.
 * @param {Function} callback
 * @returns {Q.Promise}
 * @example
 * doSomething()
 *   .then(...)
 *   .tap(console.log)
 *   .then(...);
 */
Promise.prototype.tap = function (callback) {
    callback = Q(callback);

    return this.then(function (value) {
        return callback.fcall(value).thenResolve(value);
    });
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return object instanceof Promise;
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var reportedUnhandledRejections = [];
var trackUnhandledRejections = true;

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }
    if (typeof process === "object" && typeof process.emit === "function") {
        Q.nextTick.runAfter(function () {
            if (array_indexOf(unhandledRejections, promise) !== -1) {
                process.emit("unhandledRejection", reason, promise);
                reportedUnhandledRejections.push(promise);
            }
        });
    }

    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
        unhandledReasons.push(reason.stack);
    } else {
        unhandledReasons.push("(no stack) " + reason);
    }
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        if (typeof process === "object" && typeof process.emit === "function") {
            Q.nextTick.runAfter(function () {
                var atReport = array_indexOf(reportedUnhandledRejections, promise);
                if (atReport !== -1) {
                    process.emit("rejectionHandled", unhandledReasons[at], promise);
                    reportedUnhandledRejections.splice(atReport, 1);
                }
            });
        }
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    Q.nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;

            // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
            // engine that has a deployed base of browsers that support generators.
            // However, SM's generators use the Python-inspired semantics of
            // outdated ES6 drafts.  We would like to support ES6, but we'd also
            // like to make it possible to use generators in deployed browsers, so
            // we also support Python-style generators.  At some point we can remove
            // this block.

            if (typeof StopIteration === "undefined") {
                // ES6 Generators
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return Q(result.value);
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // SpiderMonkey Generators
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return Q(exception.value);
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    Q.nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var pendingCount = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++pendingCount;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--pendingCount === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (pendingCount === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Returns the first resolved promise of an array. Prior rejected promises are
 * ignored.  Rejects only if all promises are rejected.
 * @param {Array*} an array containing values or promises for values
 * @returns a promise fulfilled with the value of the first resolved promise,
 * or a rejected promise if all promises are rejected.
 */
Q.any = any;

function any(promises) {
    if (promises.length === 0) {
        return Q.resolve();
    }

    var deferred = Q.defer();
    var pendingCount = 0;
    array_reduce(promises, function (prev, current, index) {
        var promise = promises[index];

        pendingCount++;

        when(promise, onFulfilled, onRejected, onProgress);
        function onFulfilled(result) {
            deferred.resolve(result);
        }
        function onRejected() {
            pendingCount--;
            if (pendingCount === 0) {
                deferred.reject(new Error(
                    "Can't get fulfillment value from any promise, all " +
                    "promises were rejected."
                ));
            }
        }
        function onProgress(progress) {
            deferred.notify({
                index: index,
                value: progress
            });
        }
    }, undefined);

    return deferred.promise;
}

Promise.prototype.any = function () {
    return any(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        Q.nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {Any*} custom error message or Error object (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, error) {
    return Q(object).timeout(ms, error);
};

Promise.prototype.timeout = function (ms, error) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        if (!error || "string" === typeof error) {
            error = new Error(error || "Timed out after " + ms + " ms");
            error.code = "ETIMEDOUT";
        }
        deferred.reject(error);
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            Q.nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            Q.nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

Q.noConflict = function() {
    throw new Error("Q.noConflict only works when Q is used as a global");
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});

},{}],44:[function(require,module,exports){
var fs = require('fs');
var path = require('path');
var JSZip = require('jszip');
var Q = require('q');
var async = require('async')
var ZipExport = require('./libs/ZipExport.js');
var ZippedFS = require('./libs/ZippedFS.js');

/*****************************************************************************************
******************************** PRIVATE HELPER FUNCTIONS ********************************
*****************************************************************************************/

/*
 * recursively and asynchronously vistis the directory and all subdirectories and zips all files it finds
 * @param dir {String}: the path to the subdirectory
 * @param zipped_dir {JSZip}: the JSZip object with the new directory as root
 */
function zip_dir(dir, zipped_dir) {

    var deferred = Q.defer();

    fs.readdir(dir, function (err, entries) {
        
        if (err)
            throw err;

        var entries_paths = entries.map(function (entry) { 
            return path.normalize(dir + path.sep + entry);
        });

        async.map(entries_paths, fs.stat, function (err, stats) {
            
            var entries_count = entries_paths.length;

            // construct a an array of objects each contain an with-parent entry and its type
            var typed_entries = Array(entries_count);
            for (var i = 0; i < entries_count; i++) {

                typed_entries[i] = {
                    path: entries_paths[i],
                    type: stats[i].isDirectory() ? 'dir' : 'file'
                }
            }

            async.each(typed_entries, function (entry, callback) {
                
                var parsed_entry_path = path.parse(entry.path);

                if (entry.type === 'dir') {
                    
                    var new_zipped_dir = zipped_dir.folder(parsed_entry_path.base);

                    // recursively zip the newly found dir
                    Q.fcall(zip_dir, entry.path, new_zipped_dir).then(function () {
                        //the end of this iteration
                        callback();
                    }).done();
                }
                else {

                    fs.readFile(entry.path, function (err, data) { 
                        
                        if (err)
                            throw err;
                        
                        //zip the file within the current subdir
                        zipped_dir.file(parsed_entry_path.base, data);
                        
                        // the end of this iteration
                        callback();
                    });
                } 

            }, function (err) {
                
                // here all iterations are over
                if (err)
                    throw err;

                // resolve the deffered and fullfil the promise
                deferred.resolve();      
            });
        });
    });

    return deferred.promise;
} 

/*
 * recursively and synchronously visits the directory and all subdirectories and zips all files it finds
 * @param dir {String}: the path to the subdirectory
 * @param zipped_dir {JSZip}: the JSZip object with the new directory as root
 */
function zip_dir_sync(dir, zipped_dir) {
    
    var entries = fs.readdirSync(dir);
    var entries_count = entries.length;
    
    for(var i = 0; i < entries_count; i++) {
        var entry = entries[i];        
        var entry_normalized_path = path.normalize(dir + path.sep + entry);
        var entry_stats = fs.statSync(entry_normalized_path);
        
        if(entry_stats.isDirectory()) {
            
            var new_zipped_dir = zipped_dir.folder(entry);
            
            // recursively zip the newly found dir
            zip_dir_sync(entry_normalized_path, new_zipped_dir);
        }
        else {
            
            var file = fs.readFileSync(entry_normalized_path);
            
            // zip the file within current subdir
            zipped_dir.file(entry, file);
        }
    }
}


/*****************************************************************************************
********************************** MODULE PUBLIC APIS ************************************
*****************************************************************************************/


var ZipLocal = {};  //the module container

ZipLocal.sync = {} // container for the synchronous version of the the api

/*
 * zips a given file/directory asynchronously
 * @param entity {String || Buffer || ZippedFS}: the path to file/directory to zip, the buffer containing the file or a ZippedFS object of an unzipped file
 * @param _callback {Function}: the function to be called when the zipping is done
 * @param _shiftedCallback {Function}: the callback shifted to last argument if entity is a Buffer (optional)
 */
ZipLocal.zip = function (entity, _callback, _shiftedCallback) {
    
    var zipped_obj = new JSZip();
    
    if (typeof entity === "string") {
        
        // the entity is a path pointing to a file or a directory 
        
        // the callback is not shifted 
        var callback = _callback || function () { };
        
        var normalized_path = path.normalize(entity);
        
        fs.stat(normalized_path, function (err, stats) {
            
            if (err)
                throw err;
            
            if (stats.isDirectory()) {
                
                // start zipping the directory
                Q.fcall(zip_dir, normalized_path, zipped_obj).then(function () {
                    
                    // invoke the callback
                    callback(new ZipExport(zipped_obj, false, true));
                }).done();
            }
            else {
                
                var parsed_path = path.parse(normalized_path);
                fs.readFile(normalized_path, function (err, file) {
                    
                    if (err)
                        throw err;
                    
                    zipped_obj.file(parsed_path.base, file);
                    
                    // invoke the callback
                    callback(new ZipExport(zipped_obj, false, true));

                });
            }
        });
    }
    else if (entity instanceof Buffer) {
        
        // the entity is a buffer containing a file
        
        // the _callback argument is now the name of the file in buffer
        // the callback is shifted to _shiftedCallback argument
        var name = _callback;
        var callback = _shiftedCallback || function () { };

        zipped_obj.file(name, entity);
        
        // invoke the callback
        callback(new ZipExport(zipped_obj, false, true));
    }

    else if (entity instanceof ZippedFS) {

        // the entity is a ZippedFS from an unzipped file
        var callback = _callback || function () { };

        //invoke the callback
        callback(new ZipExport(entity.unzipped_file, false, true));
    }
    else {
        throw new Error("Unsupported type: data is neither a path or a Buffer");
    }
}

/*
 * unzips a given zip file asynchronously
 * @param file {String || Buffer}: the path to the zip file or the buffer containing it
 * @param _callback {Function}: the function to be called when the unzipping is done
 */
ZipLocal.unzip = function (file, _callback) {
    
    var callback = _callback || function () { };
    var zipped_obj = new JSZip();
    
    if (typeof file === "string") {
        
        // file is a path that points to a zip file
        
        var normalized_path = path.normalize(file);
        
        fs.readFile(normalized_path, function (err, data) {
            
            zipped_obj.load(data);
            
            //invoke the callback
            callback(new ZipExport(zipped_obj, true, true))

        });
    }
    else if (file instanceof Buffer) {
        
        // file is a Buffer that contains the data

        zipped_obj.load(file);
        
        //invoke the callback
        callback(new ZipExport(zipped_obj, true, true))
    }
    else {
        throw new Error("Unsupported type: data is neither a path or a Buffer");
    }

} 

/*
 * zips a given file/directory synchronously
 * @param entity {String || Buffer || ZippedFS}: the path to the file/directory to zip, a buffer containing a file or a ZippedFS object of an unzipped file
 * @param buffer_name {String}: the name of the file if entity is buffer (optional)
 * @return {ZipExport}: the ZipExport object that contains exporting interfaces
 */
ZipLocal.sync.zip = function(entity, buffer_name) {
    
    var zipped_obj = new JSZip();
    
    if (typeof entity === "string") {
        
        // the entity is a path pointing to a file or a directory 
        
        var normalized_path = path.normalize(entity);
        var stats = fs.statSync(normalized_path);
        
        if (stats.isDirectory()) {
            
            // start zipping the directory
            zip_dir_sync(normalized_path, zipped_obj);
            
            return new ZipExport(zipped_obj);
        }
        else {
            
            var parsed_path = path.parse(normalized_path);
            var file = fs.readFileSync(normalized_path);
            
            zipped_obj.file(parsed_path.base, file);
           
        }
    }
    else if (entity instanceof Buffer) {
        
        // the entity is a buffer containing a file

        zipped_obj.file(buffer_name, entity);
    }
    else if (entity instanceof ZippedFS) {
        
        // the entity is a ZippedFS from an unzipped file
        
        //change the zipped_obj
        zipped_obj = entity.unzipped_file;
    }
    else {
        throw new Error("Unsupported type: data is neither a path or a Buffer");
    }

    return new ZipExport(zipped_obj);
}

/*
 * unzips a given zip file synchrnously
 * @param file {String || Buffer}: the path to the zip file or the buffer containing it
 * @return {ZipExport}: the ZipExport object that contains exporting interfaces
 */
ZipLocal.sync.unzip = function (file) {
    
    var zipped_obj = new JSZip();
    
    if (typeof file === "string") {
        
        // file is a path that points to a zip file

        var normalized_path = path.normalize(file);
        
        var data = fs.readFileSync(normalized_path);
        
        zipped_obj.load(data);
    }
    else if (file instanceof Buffer) {

        // file is a Buffer that contains the data

        zipped_obj.load(file);
    }
    else {
        throw new Error("Unsupported type: data is neither a path or a Buffer");
    }

    return new ZipExport(zipped_obj, true, false);
}; 


module.exports = ZipLocal;
},{"./libs/ZipExport.js":1,"./libs/ZippedFS.js":2,"async":3,"fs":undefined,"jszip":12,"path":undefined,"q":43}]},{},[44])(44)



); // end classing the main closure

