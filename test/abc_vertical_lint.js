//    abc_vertical_lint.js: Analyzes the vertical position of the output object.
//    Copyright (C) 2015 Paul Rosen (paul at paulrosen dot net)
//
//    This program is free software: you can redistribute it and/or modify
//    it under the terms of the GNU General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.
//
//    You should have received a copy of the GNU General Public License
//    along with this program.  If not, see <http://www.gnu.org/licenses/>.

//This file takes as input the output structure of the writing routine and lists the vertical position of all the elements.

/*globals toString */

if (!window.ABCJS)
	window.ABCJS = {};

if (!window.ABCJS.test)
	window.ABCJS.test = {};

window.ABCJS.test.verticalLint = function(tunes) {
	"use strict";

	function formatY(obj) {
		return "y= ( " + obj.bottom.toFixed(2) + ' , ' + obj.top.toFixed(2) + " )";
	}
	function formatArrayStart(tabs, i) {
		return tabs + i + ": ";
	}
	function getType(obj) {
		if (obj.$type === 'staff-extra') {
			if (obj.elem.length === 1) {
				switch(obj.elem[0]) {
					case "symbol clefs.G":
						return "Treble Clef";
					case "symbol clefs.F":
						return "Bass Clef";
					case "symbol clefs.C":
						return "C Clef";
					case "symbol timesig.common":
						return "Time Common";
					case "symbol timesig.cut":
						return "Time Cut";
				}
			} else if (obj.elem.length === 2) {
				var left = obj.elem[0].replace("symbol ", "");
				var right = obj.elem[1].replace("symbol ", "");
				left = parseInt(left,10);
				right = parseInt(right,10);
				if (!isNaN(left) && !isNaN(right))
					return "Time Sig " + left + "/" + right;
			}
			if (obj.elem[0] === "symbol accidentals.sharp" || obj.elem[0] === "symbol accidentals.flat" || obj.elem[0] === "symbol accidentals.nat")
				return "Key Sig";
		} else if (obj.$type.indexOf("note") === 0) {
			return obj.$type + " " + obj.duration + ' ' + obj.elem.join(" ").replace(/symbol /g,"").replace(/\n/g, "\\n");
		} else if (obj.$type === 'bar')
			return "Bar";
		else if (obj.$type === 'part')
			return obj.elem[0];
		return "unknown";
	}

	function formatStaffs(arr, indent) {
		var tabs = "";
		for (var i = 0; i < indent; i++) tabs += "\t";
		var str = "\n";
		for (i = 0; i < arr.length; i++) {
			var obj = arr[i];
			str += formatArrayStart(tabs, i) + formatY(obj) + "\n";
		}
		return tabs + str;
	}

	function formatVoices(arr, indent) {
		var tabs = "";
		for (var i = 0; i < indent; i++) tabs += "\t";
		var str = "\n";
		for (i = 0; i < arr.length; i++) {
			var obj = arr[i];
			str += formatArrayStart(tabs, i) + formatY(obj);
			str += formatElements(obj.voiceChildren, indent+1);
		}
		return tabs + str;
	}

	function formatElements(arr, indent) {
		var tabs = "";
		for (var i = 0; i < indent; i++) tabs += "\t";
		var str = "\n";
		for (i = 0; i < arr.length; i++) {
			var obj = arr[i];
			var type = getType(obj);
			if (type === "unknown")
				str += formatArrayStart(tabs, i) + formatObject(obj, indent);
			else
				str += formatArrayStart(tabs, i) + type + ' ' + formatY(obj) + "\n";
		}
		return tabs + str;
	}

	function formatArray(arr, indent) {
		var tabs = "";
		for (var i = 0; i < indent; i++) tabs += "\t";
		var str = " [\n";
		for (i = 0; i < arr.length; i++) {
			var obj = arr[i];
			if (typeof obj === "string" || typeof obj === "number")
				str += tabs + i + ": " + obj + "\n";
			else
				str += tabs + i + ":\n" + formatObject(obj, indent+1) +"\n";
		}
		return tabs + str + tabs + "]";
	}

	function formatObject(obj, indent) {
		var str = [];
		var tabs = "";
		for (var i = 0; i < indent; i++) tabs += "\t";

		if (typeof obj === "string" || typeof obj === "number")
			return tabs + obj;

		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				var value = obj[key];
				var prefix = tabs + key + ": ";
				if (key === 'staffs')
					str.push(prefix + formatStaffs(value, indent+1));
				else if (key === 'voiceChildren')
					str.push(prefix + formatElements(value, indent+1));
				else if (toString.call(value) === "[object Array]")
					str.push(prefix + formatArray(value, indent+1));
				else if (typeof obj[key] === "object")
					str.push(prefix + formatObject(value, indent+1));
				else
					str.push(prefix + value);
			}
		}
		str = str.sort();
		return str.join("\n");
	}

	function formatLine(line, lineNum) {
		var str = "";
		str += "Line: " + lineNum + ": (" + line.height + ")\n";
		str += "staffs: " + formatStaffs(line.staffs, 1);
		str += "voices: " + formatVoices(line.voices, 1);
		return str;
	}

	function extractPositioningInfo(staffGroup, lineNum) {
		var ret = { height: staffGroup.height, minSpace: staffGroup.minspace, spacingUnits: staffGroup.spacingunits, width: staffGroup.w, startX: staffGroup.startX, staffs: [], voices: [] };
		for (var i = 0; i < staffGroup.staffs.length; i++) {
			var staff = staffGroup.staffs[i];
			ret.staffs.push({bottom: staff.bottom, top: staff.top, hasLowest1: staff.hasLowest1, hasLowest2: staff.hasLowest2, hasHighest1: staff.hasHighest1, hasHighest2: staff.hasHighest2 });
		}
		for (i = 0; i < staffGroup.voices.length; i++) {
			var voice = staffGroup.voices[i];
			var obj = { bottom: voice.bottom, top: voice.top, hasLowest1: voice.hasLowest1, hasLowest2: voice.hasLowest2,
				hasHighest1: voice.hasHighest1, hasHighest2: voice.hasHighest2, width: voice.w, startX: voice.startX, voiceChildren: [] };
			for (var j = 0; j < voice.children.length; j++) {
				var child = voice.children[j];
				var type = child.type;
				if (type === 'note') {
					if (child.abcelem.pitches) {
						var pitches = [];
						for (var ii = 0; ii < child.abcelem.pitches.length; ii++) pitches.push(child.abcelem.pitches[ii].verticalPos);
						type += "(" + pitches.join(',') + ")";
					} else
						type += "(rest)";
					if (child.abcelem.lyric && child.abcelem.lyric.length > 0) type += " " + child.abcelem.lyric[0].syllable;
				}
				var obj2 = { $type: type, bottom: child.bottom, top: child.top, hasLowest1: child.hasLowest1, hasLowest2: child.hasLowest2,
					hasHighest1: child.hasHighest1, hasHighest2: child.hasHighest2, minSpacing: child.minspacing, duration: child.duration, width: child.w, x: child.x };
				obj2.elem = [];
				if (child.children.length) {
					for (var k = 0; k < child.children.length; k++) {
						var str = child.children[k].type;
						if (child.children[k].c)
							str += " " + child.children[k].c;
						obj2.elem.push(str);
					}
				}
				obj.voiceChildren.push(obj2);
			}
			// TODO: there is also extra[], heads[], elemset[], and right[] to parse.
			ret.voices.push(obj);
		}
		return formatLine(ret, lineNum);
	}

	var positioning = [];
	for (var i = 0; i < tunes.length; i++) {
		for (var j = 0; j < tunes[i].lines.length; j++) {
			if (tunes[i].lines[j].staffGroup)
				positioning.push(extractPositioningInfo(tunes[i].lines[j].staffGroup, j));
		}
	}
	return positioning;
};
