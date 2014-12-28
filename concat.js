var fs = require('fs');
var UglifyJS = require("uglify-js");
var commander = require('commander');
var uglifyjs =  require("uglify-js");
var IncludedInside = [], circulerReference = {};

function mkdir( path, root ) {
	if (!path) {
		return;
	}
	var dirs = path.split('/'), dir = dirs.shift(), root = (root || '') + dir + '/';
	try {
		fs.mkdirSync(root);
	}
	catch (e) {
		// dir wasn't made, something went wrong
		if (!fs.statSync(root).isDirectory())
			throw new Error(e);
	}
	return !dirs.length || mkdir(dirs.join('/'), root);
}

function Concatenation( sourceDir, destinDir ) {
	var isConcatinatedAdded = false, concatenatedString = "", ConcatenatedFiles = {};
	function executeFile( data, updateFile, path_file1 ) {
		var result, classIndex = 0;
		var d = data.replace(/\s/g, ""), reg;

		if (d.indexOf("prototype.$add=function(obj,key,val,isConst)") != -1) {
			concatenatedString += data;
			return data;
		}
		result = /fm.class\((.*?)\)/gi.exec(d) || /fm.Interface\((.*?)\)/gi.exec(d) || /fm.AbstractClass\((.*?)\)/gi.exec(d);
		if (result) {
			classIndex = result.index;
			result = result[1];
			result = result.substring(1, result.length - 1).split(",")[1];
			if (result) {
				result = result.substring(1).trim().replace(/\./g, "/") + ".js";
				processFile(sourceDir + result, updateFile, result);
			}
		}

		reg = /fm.include\((.*?)(function|\))/gi;
		var index,temp;
		while (result = reg.exec(d)) {
			index = result.index;
			result = result[1];
			result = result.substring(1, result.length - 1).replace(/\./g, "/").replace('"',"") + ".js";
			if (index > classIndex) {
				temp = result.split(",")[0];
				if(temp.match(/"/gm) == null) continue;
				IncludedInside.push(result.split(",")[0].replace(/"/gm, ''));
				continue;
			}
			processFile(sourceDir + result, updateFile, result);
		}

		reg = /fm.import\((.*?)\)/gi;
		while (result = reg.exec(d)) {
			result = result[1];
			result = result.substring(1, result.length - 1).replace(/\./g, "/") + ".js";
			processFile(sourceDir + result, updateFile, result);
		}

		reg = /fm.Implements\((.*?)\)/gi;
		if (result = reg.exec(d)) {
			result = result[1].split(",");
			var temp;
			for ( var k = 0; k < result.length; k++) {
				temp = result[k].substring(1, result[k].length - 1).replace(/\./g, "/") + ".js"
				processFile(sourceDir + temp, updateFile, temp);
			}
		}

		reg = /\/\/TMPL:START(.*?):END/gi;
		data = data.replace(reg, function(){
			var key = arguments[1].trim().split("|");
			var html = fs.readFileSync(sourceDir + key.join("/")).toString('utf-8').replace(/\n/g, "");
			return "Cache.getI().addTmpl('" + html + "', '"+ key[1] +"');";
		});

		if (!isConcatinatedAdded) {
			isConcatinatedAdded = true;
			concatenatedString += "\nfm.isConcatinated = true; \n fm.version=" + fileVersion + ";\n";
		}
		if (data.indexOf("\/\/\/concatelocation\/\/\/") !== -1) {
			concatenatedString = data.replace("\/\/\/concatelocation\/\/\/", concatenatedString);
		} else {
			concatenatedString += data + "\n";
		}
		return data;
	}

	function processFile( path, updateFile, filepath ) {
		if (!ConcatenatedFiles[path]) {
			ConcatenatedFiles[path] = true;
			try {
				var fileData = fs.readFileSync(path).toString('utf-8');
				updateFile(path, fileData);
				executeFile(fileData, updateFile, filepath);
			}
			catch (e) {
				console.error(e.stack);
			}
		}
	}

	function deleteFile( dir ) {
		fs.unlink(dir, function( ) {
		// dfdfdf
		});
	}
	function clone(obj){
		var newobj = {};
		for(var k in obj){
			newobj[k]= obj[k];
		}
		return newobj;
	}
	this.concatenateJSFiles = function( sFiles, concate, updatefile ) {
		ext = "js";
		backSlash = "";
		var len = sFiles.length;
		var dFile = sFiles[len - 1];
		mkdir(dFile.substring(0, dFile.lastIndexOf("/")), destinDir);
		deleteFile(destinDir + dFile);

		concatenatedString += "";

		ConcatenatedFiles = concate;
		for ( var i = 0; i < sFiles.length; i++) {
			processFile(sourceDir + sFiles[i], updatefile, sFiles[i]);
		}

		concatenatedString += ";\n\n fm.isConcatinated = false;\n";
		var temp1 = [];
		var kk = 100, strlen = sourceDir.length;
		for(var k in ConcatenatedFiles){
			temp1.push("js.bundle.ceb.asset"+ (kk++) +" = "+ k.substring(strlen));
		}
		//console.log(temp1);
		//fs.writeFileSync(destinDir + dFile, concatenatedString, 'utf8', function( e ) {
			//console.log("response", e, arguments);
		//});
		saveminiFied(concatenatedString, dFile);
		var s, fname;
		while (IncludedInside.length) {
			fname = IncludedInside.pop();
			if (fname.indexOf('http') != -1) {
				continue;
			}
			s = (fname + ".js").replace(".js.js", ".js");
			new Concatenation(sourceDir, destinDir).concatenateJSFiles([ s ], clone(ConcatenatedFiles), updatefile );
		}
	};

	function saveminiFied(data, dFile){
		mkdir(dFile.substring(0, dFile.lastIndexOf("/")), destinDir);
		console.log("saveminiFied", destinDir, dFile);
		//if(!jsp) {console.log("fg");return;}
		var final_code = UglifyJS.minify(data, {fromString: true}); // parse code and get the initial AST
		final_code = data + ";\nfm.isMinified=true;\n";
		fs.writeFileSync(destinDir + dFile.replace(".js", ".js") + "min.js", final_code, 'utf8',
			function(e) {
				console.log(e);
		});
	}
}


function createJFM( lastRun ) {
	function executeFile( data ) {
		var imports = [ 'me' ], add = true, result;
		var d = data.replace(/\s/g, ""), reg = /fm.class|fm.AbstractClass/mi;
		if (d.indexOf("prototype.$add=function(obj,key,val,isConst)") != -1) {
			return;
		}
		if (!d.match(reg)) {
			return;
		}
		if (d.indexOf("this.setMe=function(_me){me=_me;}") != -1) {
			add = false;
		}

		reg = /fm.import\((.*?)\)/gi;
		while (result = reg.exec(d)) {
			result = result[1];
			result = result.substring(1, result.length - 1).split(".");
			imports.push(result[result.length - 1]);
		}
		reg = /fm.class\((.*?)\)/gi;
		if (result = reg.exec(d)) {
			//console.log("result",result);
			result = result[1];
			result = result.substring(1, result.length - 1).split(",")[1];
			if (result) {
				result = result.substring(1).split(".");
				imports.push(result[result.length - 1]);
			}
		}
		reg = /fm.abstractclass\((.*?)\)/gi;
				if (result = reg.exec(d)) {
					//console.log("result",result);
					result = result[1];
					result = result.substring(1, result.length - 1).split(",")[1];
					if (result) {
						result = result.substring(1).split(".");
						imports.push(result[result.length - 1]);
					}
		}
		if (add) {
			reg = /=\s*function\s*\((.*?){/mi;
			return data.replace(reg, "= function (" + imports.join(", ") + "){this.setMe=function(_me){me=_me;};");
		}
		reg = /=\s*function\s*\((.*?)\)/mi;
		return data.replace(reg, "= function (" + imports.join(", ") + ")");
	}

	this.create = function( sFile, d ) {

		var stat = fs.statSync(sFile);
		//do not modify file if it has no change.
		if((new Date(stat.mtime).getTime()) < lastRun ){
			return;
		}
		d = d || fs.readFileSync(sFile).toString('utf-8');
		var data = executeFile(d);
		data && fs.writeFileSync(sFile, data, 'utf-8');
	};
}

function walk( dir, cb, lastRun ) {
	var stat, file, list = fs.readdirSync(dir);
	if (list) {
		for ( var l = 0; l < list.length; l++) {
			file = list[l];
			if (!file)
				continue;
			file = dir + '/' + file;
			stat = fs.statSync(file);
			if (stat && stat.isDirectory()) {
				walk(file, cb, lastRun);
			}
			else {
				(new Date(stat.mtime).getTime()) > lastRun && cb(file);
			}
		}
	}
}
function list(val) {
  return val.split(",");
}
var fileVersion;
function runall( a ) {

	commander
	  .version('0.0.1')
	  .option('-s, --sources <items>', 'Add source directories', list)
	  .option('-d, --destination [value]', 'add destination directory')
	  .option('-f, --files <items>', 'Add all Starting files', list)
	  .parse(a);

	var lastRun;

	/*
	for(var k=4; k < a.length; k++ ){
			files.push(a[k]);
	}
	if(commander.sourceDir == destinDir){
			throw "Source directory and destination directory can not be same.";
	}
	try{
		lastRun = Number(fs.readFileSync( (sourceDir + files[ files.length - 1 ]).replace(/\/|\\|\.|:/g, "") ).toString('utf-8'));
	}catch(e){
		lastRun = 0;
	}*/
	var updateFile = new createJFM(lastRun || 0);
	if(commander.sources[0] === commander.destination){
		console.error("destination and source cant be same!!");
		return;
	}
	//walk(base + "/js", ajt.create, lastRun);
	try{
		var ajt = new Concatenation( commander.sources[0], commander.destination );
		ajt.concatenateJSFiles(commander.files, {},  updateFile.create);
		//fs.writeFile( "./lastconcat/" + (sourceDir + files[ files.length - 1 ]).replace(/\/|\\|\.|:/g, ""), "" + Date.now(), function( ) {});
	}catch(e){
		console.log(e);
	}
}
runall(process.argv);
