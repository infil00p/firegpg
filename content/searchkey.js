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

function onLoad(win)
{
	
	if (window.arguments[0].autoSearch)
		document.getElementById('search-textbox').value = window.arguments[0].autoSearch;
	
	rebuildList();

}
function importkeys() {
	
	var selection = new Array();
	
	var start = new Object();
	var end = new Object();
	
	tree = document.getElementById('keys-listbox');
	
	var numRanges = tree.view.selection.getRangeCount();

	for (var t = 0; t < numRanges; t++){
	  tree.view.selection.getRangeAt(t,start,end);
	  for (var v = start.value; v <= end.value; v++){
		  
		selection[tree.view.getItemAtIndex(v).firstChild.getAttribute("gpg-id")] = tree.view.getItemAtIndex(v).firstChild.getAttribute("gpg-id");
	  }
	}
	
	keysToImport = "";
	for (id in selection) {
		keysToImport += id + " ";
	}
	
	FireGPG.retriveKeyFromServer(keysToImport);

	
}


function rebuildList() {
	
	var search = document.getElementById('search-textbox').value;
	
	if (trim(search) == "")
		return;
	
	keylistcall = FireGPG.searchKeyInServer(search);

    if (keylistcall.result == RESULT_SUCCESS)
        gpg_keys = keylistcall.keylist;
    else
        gpg_keys = new Array();

	var listbox = document.getElementById('keys-listbox-child');
	
	while (listbox.firstChild) {
  		listbox.removeChild(listbox.firstChild);
	}

	

    var current = 0;
	for(var key in gpg_keys) {

        if (gpg_keys[key].keyName) {
			
            current++;

            item = CreateTreeItemKey2(gpg_keys[key], document);

            if (gpg_keys[key].subKeys.length > 0) {

                item.setAttribute("container", "true");
                var subChildren=document.createElement("treechildren");

                for(var skey in gpg_keys[key].subKeys) {

                    if (gpg_keys[key].subKeys[skey].keyName) {

                        var subItem = CreateTreeItemKey( gpg_keys[key].subKeys[skey] ,document, gpg_keys[key].keyId);

                        subChildren.appendChild(subItem);
                    }

                    item.appendChild(subChildren);

                }
            }

            listbox.appendChild(item);


        }
	}
	
}