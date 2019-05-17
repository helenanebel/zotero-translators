{
	"translatorID": "30f0052d-e8fc-45ac-a1db-7a729f0da376",
	"label": "Mohr Siebeck",
	"creator": "Madeesh Kannan",
	"target": "https?://www.mohrsiebeck.com/",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 90,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2019-05-17 14:20:25"
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
	if (url.match(/\/((journal)|(heft)|(issue))\//) ||
		ZU.xpath(doc, '//h2[contains(@class, "issue-article-h2")]//a')) {
		return "multiple";
 	} else if (url.match(/\/arti((cle)|(kel))\//)) {
		return "journalArticle";
	}
}

function getSearchResults(doc) {
	var items = {};
	var found = false;
	var rows = ZU.xpath(doc, '//h2[contains(@class, "issue-article-h2")]//a')
	for (let i=0; i<rows.length; i++) {
		let href = rows[i].href;
		let title = ZU.trimInternal(rows[i].textContent);
		if (!href || !title) continue;
		found = true;
		items[href] = title;
	}
	return found ? items : false;
}

function postProcess(doc, item) {
	if (!item.abstractNote)
		item.abstractNote = ZU.xpathText(doc, '//div[@id="previewShort"]');

	if (!item.DOI)
		item.DOI = ZU.xpathText(doc, "//span[@class='list-item-type' and contains(text(), 'DOI:')][1]/following-sibling::span[1]/a");

	if (!item.ISSN)
		item.ISSN = ZU.xpathText(doc, "//span[@class='list-item-type' and contains(text(), 'ISSN:')][1]/following-sibling::span[1]");

	item.tags = ZU.xpath(doc, '//div[@id="productKeywords"]//a').map(i => i.textContent.trim());

	item.creators = ZU.xpathText(doc, '//h2[contains(@class, "product-heading-author-block")]').split(",").map(i => ZU.cleanAuthor(i));

	if (!item.language)
		item.language = ZU.xpathText(doc, '//meta[@name="language"]/@content');
}

function invokeCoinsTranslator(doc, url) {
	var translator = Zotero.loadTranslator("web");
	translator.setTranslator("05d07af9-105a-4572-99f6-a8e231c0daef");
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
			ZU.processDocuments(articles, invokeCoinsTranslator);
		});
	} else
		invokeCoinsTranslator(doc, url);
}
/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://www.mohrsiebeck.com/artikel/machtkonstellationen-jenseits-von-realismus-und-idealismus-101628003181516x14791276269803",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Machtkonstellationen: Jenseits von Realismus und Idealismus",
				"creators": [
					{
						"firstName": "Georg",
						"lastName": "Zenkert"
					}
				],
				"date": "2016",
				"DOI": "10.1628/003181516X14791276269803",
				"ISSN": "0031-8159",
				"abstractNote": "Claudia Horst: Marc Aurel. Philosophie und politische Macht zur Zeit der Zweiten Sophistik. Franz Steiner Verlag. Stuttgart 2013. 232 S. Herfried Münkler/Rüdiger Voigt/Ralf Walkenhaus (Hg.): Demaskierung der Macht. Niccolò Machiavellis Staats- und Politikverständnis. Nomos. 2. Auflage. Baden-Baden 2013. 224 S. Dietrich Schotte: Die Entmachtung Gottes durch den Leviathan. Thomas Hobbes über die Religion. Frommann-Holzboog. Stuttgart-Bad Cannstatt 2013. 360 S.",
				"issue": "3",
				"language": "de",
				"libraryCatalog": "Mohr Siebeck",
				"pages": "195-206",
				"publicationTitle": "Philosophische Rundschau (PhR)",
				"shortTitle": "Machtkonstellationen",
				"volume": "63",
				"attachments": [
					{}
				],
				"tags": [],
				"notes": [],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
