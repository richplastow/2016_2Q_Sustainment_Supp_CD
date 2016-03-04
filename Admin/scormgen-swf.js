//// scormgen-swf v0.0.6
//// ===================

//// Usage:
//// $ node [your path here]/Admin/scormgen-swf.js


!function (
    fstream  // bundled, `/*fstream*/ (function e(t,n,r){...`, below
  , tar      // bundled, see `/*tar*/ (function e(t,n,r){...`, below
) {

//// Initialize variables. 
var
    fs   = require('fs')
  , path = require('path')
  , zlib = require('zlib')
  , gzip = zlib.createGzip()
  , zipSize = null
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
  var reader = fstream.Reader({
      path: SCORMContentPath
    , type: 'Directory'
  })

  var writer = fstream.Writer({
      // path: tmp + '.tar.gz'
      path: SCORMContentPath + '.zip'
  })

  var stream =
      reader
    . pipe( tar.Pack() )   // convert the directory to a .tar file
    . pipe( zlib.Gzip() )  // compress the .tar file
    // . pipe( zlib.createGzip() )  // compress the .tar file
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



chain.push(function complete () {
  var color = 2000000 < zipSize ? '\033[31m' : '';
  log('Zipped to ' + color + (zipSize / 1000000.0) + ' MB\033[0m');
});




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








); // end classing the main closure

