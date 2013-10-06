<?php
class Concat(){
    
	private isConcatinatedAdded = false, concatenatedString = "", ConcatenatedFiles =  array();
	
	function makedir( $path, $root ) {
		if (!$path) {
			return;
		}
		try {
			mkdir($root . $path);
		}
		catch ($e) {
			throw new Exception($e);
		}
	}

	function executeFile( $data, $updateFile ) {
		$result, $classIndex = 0;
		$d = str_replace(" ", "", $data);
		
		if ( strpos($d, "prototype.$add=function(obj,key,val,isConst)") != false){			
			$this->concatenatedString .= $data;
			return;
		}
		$result = preg_match('/fm.class\((.*?)\)/gi', $d);
		if ($result) {
			$classIndex = $result.index;
			$result = $result[1];
			$result = substr($result, 1, $result.length - 1);
			if ($result) {
				$result = $result.substring(1).trim().replace(/\./g, "/") + ".js";
				processFile(sourceDir . $result, updateFile);
			}
		}
		
		reg = preg_match('/fm.include\((.*?)\)/gi', $d);
		var index;
		while ($result = reg.exec(d)) {
			index = $result.index;
			$result = $result[1];
			$result = $result.substring(1, $result.length - 1).replace(/\./g, "/") + ".js";
			if (index > classIndex) {
				IncludedInside.push($result.split(",")[0].replace(#/"/gm#, ''));
				continue;
			}
			processFile(sourceDir + $result, updateFile);
		}
		
		reg = /fm.import\((.*?)\)/gi;
		while ($result = reg.exec(d)) {
			$result = $result[1];
			$result = $result.substring(1, $result.length - 1).replace(/\./g, "/") + ".js";
			processFile(sourceDir + $result, updateFile);
		}
		
		
		reg = /fm.Implements\((.*?)\)/gi;
		if ($result = reg.exec(d)) {
			$result = $result[1].split(",");
			
			for ( var k = 0; k < $result.length; k++) {
			
				processFile(sourceDir + $result[k].substring(1, $result[k].length - 1).replace(/\./g, "/") + ".js", updateFile);
			}
		}
		
		if (!isConcatinatedAdded) {
			isConcatinatedAdded = true;
			concatenatedString += "\nfm.isConcatinated = true; \n fm.version=" + fileVersion + ";\n";
		}
		concatenatedString += data + "\n";
	}
	
	function processFile( path, updateFile ) {
		if (!ConcatenatedFiles[path]) {
			ConcatenatedFiles[path] = true;
			try {
				var fileData = file_get_contents(path, true);

				updateFile(path, fileData);
				executeFile(fileData, updateFile);
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
	
	function concatenateJSFiles( sFiles, concate, updatefile ) {
		ext = "js";
		backSlash = "";
		var len = sFiles.length;
		var dFile = sFiles[len - 1];
		makedir(dFile.substring(0, dFile.lastIndexOf("/")), destinDir);
		deleteFile(destinDir + dFile);
		
		concatenatedString += "";
		ConcatenatedFiles = concate;
		for ( var i = 0; i < sFiles.length; i++) {
			processFile(sourceDir + sFiles[i], updatefile);
		}
		concatenatedString .= ";\n\n fm.isConcatinated = false;\n";
		fs.writeFileSync(destinDir + dFile, concatenatedString, 'utf8', function( e ) {
			console.log("response", e, arguments);
		});
	};
}