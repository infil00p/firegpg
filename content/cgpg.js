/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is FireGPG.
 *
 * The Initial Developer of the Original Code is
 * FireGPG Team.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * 
 * ***** END LICENSE BLOCK ***** */

const NS_IPCSERVICE_CONTRACTID  = "@mozilla.org/process/ipc-service;1";
const NS_APPINFO_CONTRACTID = "@mozilla.org/xre/app-info;1";
const NS_PROCESSUTIL_CONTRACTID = "@mozilla.org/process/util;1";

const WINDOWS = "WINNT";
const FireGPG_OS = Components.classes[NS_APPINFO_CONTRACTID].getService(Components.interfaces.nsIXULRuntime).OS;;

// Return class, for return 2 or 3 informations in an object.
var GPGReturn = {
}

// Main class for access to GPG
var GPG = {
	/*
	* Function to sign a text.
	*/
	sign: function() {
		// GPG verification
		if(!GPG.selfTest())
			return;
		
		// For i18n
		var i18n = document.getElementById("firegpg-strings");
		var text = Selection.get();
		
		if (text == "") {
			alert(i18n.getString("noData"));
			return;
		}
		
		// Needed for a sign
		var password = getPrivateKeyPassword();
		var keyID = getSelfKey();
		
		if (password == null) {
			return;
		}
		
		var result = this.baseSign(text,password,keyID);
		var crypttext = result.output;
		var sdOut2 = result.sdOut2;
		result = result.sdOut;
		
		// If the sign failled
		if(result == "erreur") {
			// We alert the user
			alert(i18n.getString("signFailed") + sdOut2);
		} 
		else if(result == "erreurPass") {
				alert(i18n.getString("signFailedPassword"));
				eraseSavedPassword();
		} 
		else {
			// We test if the selection is editable :
			if(Selection.isEditable()) {	
				// If yes, we edit this selection with the new text
				Selection.set(crypttext);
			}
			else //Else, we show a windows with the result
				showText(crypttext);
		}
	},
	
	baseSign: function(text,password,keyID) {
		// We get the result
		var result = this.GPGAccess.sign(text, password, keyID);
		var tresult = result.sdOut;
		
		result.sdOut = "ok";
		
		if(tresult.indexOf("SIG_CREATED") == "-1")
		{
			result.sdOut = "erreur";
			result.sdOut2 = tresult;
		}
		
		if(tresult.indexOf("BAD_PASSPHRASE") != "-1") {
			result.sdOut = "erreurPass";
		}
		
		return result;
	}, 
	
	// Verify a signature
	verify: function() {
		// GPG verification
		if(!GPG.selfTest())
			return;
		
		// For I18N
		var i18n = document.getElementById("firegpg-strings");
		
		var text = Selection.get();
		
		if (text == "") {
			alert(i18n.getString("noData"));
			return;
		}
		
		result = this.baseVerify(text);
		
		// For I18N
		var i18n = document.getElementById("firegpg-strings");
		
		if (result == "noGpg") {
			alert(i18n.getString("noGPGData"));
			return;
		}
		else if (result == "erreur")
			alert(i18n.getString("verifFailed"));
		else {
			infos = result.split(" ");
			
			var infos2 = ""; 
			for (var ii = 1; ii < infos.length; ++ii)
			{  infos2 = infos2 + infos[ii] + " ";}
			
			alert(i18n.getString("verifSuccess") + " " + infos2);
		}
	},

	baseVerify: function(text) {

		//Verify GPG'data presence
		reg=new RegExp("\\- \\-\\-\\-\\-\\-BEGIN PGP SIGNED MESSAGE\\-\\-\\-\\-\\-", "gi"); // We don't have to detect disabled balises
		text = text.replace(reg, "FIREGPGTRALALABEGINHIHAN");

		reg=new RegExp("\\- \\-\\-\\-\\-\\-END PGP SIGNATURE\\-\\-\\-\\-\\-", "gi"); // We don't have to detect disabled balises
		text = text.replace(reg, "FIREGPGTRALALAENDHIHAN");


		//Verify GPG'data presence
		var firstPosition = text.indexOf("-----BEGIN PGP SIGNED MESSAGE-----");
		var lastPosition = text.indexOf("-----END PGP SIGNATURE-----");
		

		reg=new RegExp("FIREGPGTRALALABEGINHIHAN", "gi"); // We don't have to detect disabled balises
		text = text.replace(reg, "-----BEGIN PGP SIGNED MESSAGE-----");

		reg=new RegExp("FIREGPGTRALALAENDHIHAN", "gi"); // We don't have to detect disabled balises
		text = text.replace(reg, "-----END PGP SIGNATURE-----");

		if (firstPosition == -1 || lastPosition == -1) {
			return "noGpg";
		}
		
		text = text.substring(firstPosition,lastPosition + ("-----END PGP SIGNATURE-----").length);
		
		// We get the result
		var result = this.GPGAccess.verify(text);
		
		// If check failled
		if(result.indexOf("GOODSIG") == "-1") {
			return "erreur";
		}
		else {
			// If he work, we get informations of the Key
			var infos = result;
			
			infos = infos.substring(0,infos.indexOf("GOODSIG") + 8);
			infos = result.replace(infos, "");
			infos = infos.substring(0,infos.indexOf("GNUPG") - 2);
			
			return infos;
		}
	},
	
	/*
	 * List all keys.
	 *
	 * An object is returned :
	 *     object["key_id"] = "Name (name) <email>"
	 */
	listKeys: function(onlyPrivate) {
		var retour = new Array();
		
		// GPG verification
		if(!GPG.selfTest())
			return retour;
		
		var infos;
		
		// We get informations from GPG
		var result = this.GPGAccess.listkey(onlyPrivate);
		
		// Parsing
		var reg = new RegExp("\r", "g");
		var result = result.replace(reg,"\n");
		var reg = new RegExp("\n\n", "g");
		var result = result.replace(reg,"\n");

		var reg = new RegExp("[\n]+", "g");
		var list = result.split(reg);
		
		// var reg2=new RegExp("[:]+", "g");
		
		for (var i = 0; i < list.length; i++) {
			infos = new Array();
			try { infos = list[i].split(":");
		
			if(infos[0] == "pub" || infos[0] == "sec")
				retour[infos[4]] = infos[9] ;
			} catch (e) { }
		}
		
		return retour;
	},

	/*
	* Function to crypt a text.
	*/
	crypt: function() {
		// GPG verification
		if(!GPG.selfTest())
			return;
		
		// For i18n
		var i18n = document.getElementById("firegpg-strings");
		var text = Selection.get();
		
		if (text == "") {
			alert(i18n.getString("noData"));
			return;
		}
		
		// Needed for a crypt
		var keyID = choosePublicKey();
		
		if(keyID == null) {
			return;
		}
		
		// We get the result
		var result = this.baseCrypt(text, keyID);
		var crypttext = result.output;
		var sdOut2 = result.sdOut2;
		result = result.sdOut;
		
		// If the crypt failled
		if(result == "erreur") {
			// We alert the user
			alert(i18n.getString("cryptFailed") + sdOut2);
		} 
		else {
			//We test is the selection in editable :
			if(Selection.isEditable()) {
				//If yes, we edit this selection with the new text
				Selection.set(crypttext);
			}
			else {
				//Else, we show a windows with the result
				showText(crypttext);
			}
		}
	},
	
	baseCrypt: function(text, keyID) {
		var result = this.GPGAccess.crypt(text, keyID);
		var tresult = result.sdOut;
		
		result.sdOut = "ok";
		
		if(tresult.indexOf("END_ENCRYPTION") == "-1")
		{
			result.sdOut = "erreur";
			result.sdOut2 = tresult;
		}
		
		return result;
	},

	/*
	* Function to decrypt a text.
	*/
	decrypt: function() {
		// GPG verification
		if(!GPG.selfTest())
			return;
		
		// For i18n
		var i18n = document.getElementById("firegpg-strings");
		
		var text = Selection.get();
		
		if (text == "") {
			alert(i18n.getString("noData"));
			return;
		}
		
		//Verify GPG'data presence
		reg=new RegExp("\\- \\-\\-\\-\\-\\-BEGIN PGP MESSAGE\\-\\-\\-\\-\\-", "gi"); // We don't have to detect disabled balises
		text = text.replace(reg, "FIREGPGTRALALABEGINHIHAN");

		reg=new RegExp("\\- \\-\\-\\-\\-\\-END PGP MESSAGE\\-\\-\\-\\-\\-", "gi"); // We don't have to detect disabled balises
		text = text.replace(reg, "FIREGPGTRALALAENDHIHAN");

		var firstPosition = text.indexOf("-----BEGIN PGP MESSAGE-----");
		var lastPosition = text.indexOf("-----END PGP MESSAGE-----");

		reg=new RegExp("FIREGPGTRALALABEGINHIHAN", "gi"); // We don't have to detect disabled balises
		text = text.replace(reg, "-----BEGIN PGP MESSAGE-----");

		reg=new RegExp("FIREGPGTRALALAENDHIHAN", "gi"); // We don't have to detect disabled balises
		text = text.replace(reg, "-----END PGP MESSAGE-----");
		
		if (firstPosition == -1 || lastPosition == -1) {
			alert(i18n.getString("noGPGData"));
			return;
		}
		
		text = text.substring(firstPosition,lastPosition + ("-----END PGP MESSAGE-----").length);
		
		// Needed for a decrypt
		var password = getPrivateKeyPassword();
		
		if(password == null) {
			return;
		}
		
		// We get the result
		var result = this.baseDecrypt(text,password);
		var crypttext = result.output;
		var sdOut2 = result.sdOut2;
		result = result.sdOut;
		
		// If the crypt failled
		if (result == "erreurPass") {
			alert(i18n.getString("decryptFailedPassword"));
			eraseSavedPassword();
		}
		else if (result == "erreur") {
			alert(i18n.getString("decryptFailed") + sdOut2);
		} 
		else {
			//We test is the selection in editable :
			if(Selection.isEditable()) {
				//If yes, we edit this selection with the new text
				Selection.set(crypttext);
			}
			else {
				//Else, we show a windows with the result
				showText(crypttext);
			}
		}
	},

	baseDecrypt: function(text,password) {
		var result = this.GPGAccess.decrypt(text,password);
		var tresult = result.sdOut;
		
		result.sdOut = "ok";
		
		if(tresult.indexOf("DECRYPTION_OKAY") == "-1")
		{
			result.sdOut = "erreur";
			result.sdOut2 = tresult;
		}
		
		if(tresult.indexOf("BAD_PASSPHRASE") != "-1")
			result.sdOut = "erreurPass";
		
		return result;
	},
	
	/*
	 * Test if GPG exists.
	 * Return false on error.
	 */
	selfTest: function() {
		// For i18n
		var i18n = document.getElementById("firegpg-strings");
		
		if (this.GPGAccess.selfTest() == false) {
			alert(i18n.getString("selfTestFailled"));
			return false;
		}
		
		return true;
	},
	
	/*
	* Function to import a public key.
	*/
	kimport: function() {
		// GPG verification
		if(!GPG.selfTest())
			return;
		
		// For i18n
		var i18n = document.getElementById("firegpg-strings");
		
		var text = Selection.get();
		
		if (text == "") {
			alert(i18n.getString("noData"));
			return;
		}
		
		var retour = this.baseKimport(text);
		
		if (retour == "noGPG") {
			alert(i18n.getString("noGPGData"));
			return;
		}
		else if (retour == "error") {
			alert(i18n.getString("importFailed"));
		}
		else if (retour == "ok") {
			alert(i18n.getString("importOk"));
		}
	},

	baseKimport: function(text) {
		//Verify GPG'data presence
		var firstPosition = text.indexOf("-----BEGIN PGP PUBLIC KEY BLOCK-----");
		var lastPosition = text.indexOf("-----END PGP PUBLIC KEY BLOCK-----");
		
		if (firstPosition == -1 || lastPosition == -1) {
			return "noGPG";
		}
		
		text = text.substring(firstPosition,lastPosition + ("-----END PGP PUBLIC KEY BLOCK-----").length);
		
		// We get the result
		var result = this.GPGAccess.kimport(text);
		
		// If the crypt failled
		if(result.indexOf("IMPORT_OK") == "-1")
			return "error";
		else
			return "ok";
	},

	/*
	* Function to import a public key.
	*/
	kexport: function() {
		// GPG verification
		if(!GPG.selfTest())
			return;
		
		// For i18n
		var i18n = document.getElementById("firegpg-strings");
		
	
		// Needed for a crypt
		var keyID = choosePublicKey();
		
		if(keyID == null) {
			return;
		}


		var retour = this.baseExport(keyID);

		if (retour == "error") {
			alert(i18n.getString("exportFailed"));
		}
		else  {
				showText(retour);
		}
	},

	baseExport: function(key) {

		// We get the result
		var result = this.GPGAccess.kexport(key);
		
		// If the crypt failled
		if(result == "")
			return "error";
		else
			return result;
	}

};

// We load the good class for the OS
GPG.GPGAccess = (FireGPG_OS == WINDOWS) ? GPGWin : GPGLin;
GPG.GPGAccess.parent = GPG;

useGPGAgent = GPG.GPGAccess.runATest('--no-use-agent');
useGPGTrust = GPG.GPGAccess.runATest('--trust-model always');

// vim:ai:noet:sw=4:ts=4:sts=4:tw=0:fenc=utf-8:foldmethod=indent:
