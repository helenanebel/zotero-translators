{
	"translatorID": "b2fcf7d9-e023-412e-a2bc-f06d6275da24",
	"label": "ubtue_Brill",
	"creator": "Madeesh Kannan, Timotheus Kim",
	"target": "^https?://brill.com/view/journals/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 90,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2021-07-20 17:33:03"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2019 Universitätsbibliothek Tübingen.  All rights reserved.

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/


function detectWeb(doc, url) {
	if (url.match(/article-.+\.xml$/)) {
		return "journalArticle";
	} else if (url.match(/issue-\d+(-\d+)?\.xml$/)) {
		return "multiple";
 	}
	return false;
}

function getSearchResults(doc) {
	let items = {};
	let found = false;
	let links = doc.querySelectorAll(".c-Typography--title");
	let usesTypography = !!links.length;
	if (!usesTypography) {
		links = doc.querySelectorAll(".c-Button--link, [target='_self']");
	}
	let text = usesTypography ?
			doc.querySelectorAll(".c-Typography--title > span") :
			doc.querySelectorAll(".c-Button--link, [target='_self']");
	for (let i = 0; i < links.length; ++i) {
		let href = links[i].href;
		let title = ZU.trimInternal(text[i].textContent);
		if (!href || !title) continue;
		if (!href.match(/article-.+\.xml$/))
			continue;

		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function postProcess(doc, item) {
	if (!item.abstractNote) {
	  item.abstractNote = ZU.xpath(doc, '//section[@class="abstract"]//p');
	  if (item.abstractNote && item.abstractNote.length > 0)
		 item.abstractNote = item.abstractNote[0].textContent.trim();
	  else
		 item.abstractNote = '';
	}
	item.tags = ZU.xpath(doc, '//dd[contains(@class, "keywords")]//a');
	if (item.tags) {
		let allTags = item.tags.map(i => i.textContent.trim());
		//deduplicate
		item.tags = Array.from(new Set(allTags.map(JSON.stringify))).map(JSON.parse);
	}
	let reviewEntry = text(doc, '.articlecategory');
	if (reviewEntry && reviewEntry.match(/book\sreview/i)) item.tags.push('Book Review');
	// numbering issues with slash due to cataloguing rule
	if (item.issue) item.issue = item.issue.replace('-', '/');
	let date = item.date;
	//entry for scraping Berichtsjahr
	let dateEntry = ZU.xpathText(doc, '//div[@class="cover cover-image configurable-index-card-cover-image"]//@title');
	let berichtsjahr = extractBerichtsjahr(dateEntry);
	let erscheinungsjahr = extractErscheinungsjahr(date);
	if (erscheinungsjahr !== berichtsjahr) {
		item.date = extractBerichtsjahr(dateEntry);
	} else {
		item.date;
	}

	//scrape ORCID from website
	let authorSectionEntries = doc.querySelectorAll('.text-subheading span:nth-child(2)');
	for (let authorSectionEntry of authorSectionEntries) {
		let authorInfo = authorSectionEntry.querySelector('.c-Button--link');
		let orcidHref = authorSectionEntry.querySelector('.orcid');
		if (authorInfo && orcidHref) {
			let author = authorInfo.childNodes[0].textContent;
			let orcid = orcidHref.textContent.replace(/.*(\d{4}-\d+-\d+-\d+x?)$/i, '$1');
			item.notes.push({note: "orcid:" + orcid + ' | ' + author});
		}
	}
	//delete symbols in names
	for (let i in item.creators) {
		item.creators[i].lastName = item.creators[i].lastName.replace('†', '');
		item.creators[i].firstName = item.creators[i].firstName.replace('†', '');
	}
	//deduplicate
	item.notes = Array.from(new Set(item.notes.map(JSON.stringify))).map(JSON.parse);
	// mark articles as "LF" (MARC=856 |z|kostenfrei), that are published as open access	
	let openAccessTag = text(doc, '.has-license span');
	if (openAccessTag && openAccessTag.match(/open\s+access/gi)) item.notes.push('LF:');
  // mark articles as "LF" (MARC=856 |z|kostenfrei), that are free accessible e.g. conference report 10.30965/25890433-04902001 
	let freeAccess = text(doc, '.color-access-free');
	if (freeAccess && freeAccess.match(/(free|freier)\s+(access|zugang)/gi)) item.notes.push('LF:');
	if (!item.itemType)	item.itemType = "journalArticle";
}

function extractErscheinungsjahr(date) {
	return date ? date.trim().match(/\d{4}/)[0] : '';
}

function extractBerichtsjahr(dateEntry) {
	let dateCandidate = dateEntry.match(/\(\s*(\d{4})\s*\):/);
	return dateCandidate.length > 1 ? dateCandidate[1] : null;
}

function invokeEmbeddedMetadataTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("951c027d-74ac-47d4-a107-9c3069ab7b48");
	translator.setDocument(doc);
	translator.setHandler("itemDone", function (t, i) {
		postProcess(doc, i);
		i.complete();
	});
	translator.translate();
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) === "multiple") {
		Zotero.selectItems(getSearchResults(doc), function (items) {
			if (!items) {
				return true;
			}
			var articles = [];
			for (var i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, invokeEmbeddedMetadataTranslator);
		});
	} else
		invokeEmbeddedMetadataTranslator(doc, url);
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://brill.com/view/journals/vt/71/3/article-p365_5.xml",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "The Future of the Past: Literarische Prophetien, Prophetenspruchsammlungen und die Anfänge der Schriftprophetie",
				"creators": [
					{
						"firstName": "Alexandra",
						"lastName": "Grund-Wittenberg",
						"creatorType": "author"
					}
				],
				"date": "2021/02/18",
				"DOI": "10.1163/15685330-12341069",
				"ISSN": "0042-4935, 1568-5330",
				"abstractNote": "<section class=\"abstract\"><h2 class=\"abstractTitle text-title my-1\" id=\"d312172225e149\">Abstract</h2><p>The article is a contribution to the current discussion about the beginnings of prophetic books in ancient Israel. It investigates the significance of the so-called „Literary Predictive Texts“ (<span style=\"font-variant: small-caps;\">LPT</span>) and the Neo-Assyrian prophecies for our understanding of the emergence of prophetic writings in Israel. The<span style=\"font-variant: small-caps;\">LPT</span>in particular had received only little attention so far. Tying in critically with some recent studies, this article compares the Marduk prophecy and the Neo-Assyrian tablet <span style=\"font-variant: small-caps;\">SAA</span>9 3 with selected passages from the book of Amos (Amos 3–6* and Amos 6*). It concludes that in contrast to the Neo-Assyrian collective tablets the <span style=\"font-variant: small-caps;\">LPT</span>cannot serve as appropriate analogies to early prophetic scrolls, but that they are helpful to understand the phenomenon of tradent prophecy.</p></section>",
				"issue": "3",
				"language": "ger",
				"libraryCatalog": "brill.com",
				"pages": "365-396",
				"publicationTitle": "Vetus Testamentum",
				"shortTitle": "The Future of the Past",
				"url": "https://brill.com/view/journals/vt/71/3/article-p365_5.xml",
				"volume": "71",
				"attachments": [
					{
						"title": "Full Text PDF",
						"mimeType": "application/pdf"
					},
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "Amos"
					},
					{
						"tag": "Literary Prophetic Texts"
					},
					{
						"tag": "Marduk prophecy"
					},
					{
						"tag": "Neo-Assyrian prophecies"
					},
					{
						"tag": "early stages of prophetic books"
					}
				],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
