{
	"translatorID": "516ad412-d9f3-48b6-ac66-404e117c5cfb",
	"label": "uclouvain",
	"creator": "Timotheus Kim",
	"target": "^https?://(www\\.)?dial\\.uclouvain\\.be",
	"minVersion": "3.0",
	"maxVersion": "",
	"priority": 99,
	"inRepository": true,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2022-10-13 10:22:19"
}

/*
	***** BEGIN LICENSE BLOCK *****

	Copyright © 2022 Universitätsbibliothek Tübingen All rights reserved.

	This file is part of Zotero.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero. If not, see <http://www.gnu.org/licenses/>.

	***** END LICENSE BLOCK *****
*/

function detectWeb(doc, url) {
	if (url.includes('/object/')) {
		return "journalArticle";
	}
	else if (getSearchResults(doc, true)) {
		return "multiple";
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
 	var items = {};
 	var found = false;
 	var rows = doc.querySelectorAll('.title a');
 	for (let row of rows) {
 		let href = row.href;
 		let title = ZU.trimInternal(row.textContent);
 		if (!href || !title) continue;
 		if (checkOnly) return true;
 		found = true;
 		items[href] = title;
 	}
 	return found ? items : false;
 }
 
function doWeb(doc, url) {
 	if (detectWeb(doc, url) == "multiple") {
 		Zotero.selectItems(getSearchResults(doc, false), function (items) {
 			if (items) ZU.processDocuments(Object.keys(items), scrape);
 		});
 	}
 	else {
 		scrape(doc, url);
 	}
 }

function scrape(doc, url) {
	let oai_url = url.replace('https://dial.uclouvain.be/pr/boreal/object/', 'https://dial.uclouvain.be/oai/?verb=GetRecord&metadataPrefix=marcxml&identifier=');
	ZU.doGet(oai_url, function (text) {
		var parser = new DOMParser();
		var xml = parser.parseFromString(text, "text/xml");
			var translator = Zotero.loadTranslator("import");
			translator.setTranslator("edd87d07-9194-42f8-b2ad-997c4c7deefd");
			translator.setString(text);
			translator.setHandler("itemDone", function (obj, item) {
				item.notes = [];
				let absNr = 0;
				for (let abstract of ZU.xpath(xml, '//*[@tag="520"]/*[@code="a"]')) {
					if (!['n/a', '.'].includes(abstract.textContent)) {
						if (absNr == 0) {
							item.abstractNote = abstract.textContent;
						}
						else {
							item.notes.push('abs:' + abstract.textContent);
						}
						absNr += 1;
					}
				}
				item.itemType = "journalArticle";
				for (let url of ZU.xpath(xml, '//*[@tag="856"]/*[@code="u"]')) {
					if (url.textContent.match('/2078.1/')) {
						item.url = url.textContent;
						break;
					}
				}
				item.notes.push('LF:');
				let identifier =  ZU.xpathText(xml, '//*[@tag="001"]');
				item.notes.push('hdl:' + identifier.replace('boreal:', '2078.1'));
				//add_marc_field_024 = "0247 \037a%hdl%\0372hdl
				for (let identifier of ZU.xpath(xml, '//*[@tag="022"]')) {
					if (ZU.xpathText(identifier, './*[@code="v"]') == 'e-issn') {
						item.notes.push('issn:' + ZU.xpathText(identifier, './*[@code="a"]'));
						break;
					}
					else if (ZU.xpathText(identifier, './*[@code="v"]') == 'issn') {
						item.notes.push('issn:' + ZU.xpathText(identifier, './*[@code="a"]'));
					}
				}
				if (!item.volume && !item.issue && !item.pages) {
					if (ZU.xpathText(xml, '//*[@tag="779"]/*[@code="g"]')) {
						item.notes.push('773$g:' + ZU.xpathText(xml, '//*[@tag="779"]/*[@code="g"]'));
					}
					if (ZU.xpathText(xml, '//*[@tag="779"]/*[@code="z"]')) {
						item.notes.push('773$z:' + ZU.xpathText(xml, '//*[@tag="779"]/*[@code="z"]'));
					}
					if (ZU.xpathText(xml, '//*[@tag="779"]/*[@code="z"]')) {
						item.notes.push('773$z:' + ZU.xpathText(xml, '//*[@tag="779"]/*[@code="z"]').replace(/ISBN\s*/, ''));
					}
					if (ZU.xpathText(xml, '//*[@tag="779"]/*[@code="a"]')) {
						if (ZU.xpathText(xml, '//*[@tag="779"]/*[@code="t"]')) {
						item.notes.push('773$t:' + ZU.xpathText(xml, '//*[@tag="779"]/*[@code="a"]') + ': ' + ZU.xpathText(xml, '//*[@tag="779"]/*[@code="t"]'));
						}
					}
				}
				else {
					if (ZU.xpathText(xml, '//*[@tag="773"]/*[@code="g"]')) {
						item.notes.push('773$g:' + ZU.xpathText(xml, '//*[@tag="773"]/*[@code="g"]'));
					}
				}
				for (let responsible of ZU.xpath(xml, '//*[@tag="100" or @tag="700"]')) {
					if (ZU.xpathText(responsible, './*[@code="o"]')!= null) {
						item.notes.push('orcid: ' + ZU.xpathText(responsible, './*[@code="o"]').replace(/https?:\/\/orcid.org\//, '') + ' | ' + ZU.xpathText(responsible, './*[@code="a"]') + ' | taken from website');
					}
				}
				if (ZU.xpath(xml, '//*[@tag="260"]') != null) {
					if (ZU.xpathText(xml, '//*[@tag="260"]/*[@code="a"]')) item.notes.push('place:' + ZU.xpathText(xml, '//*[@tag="260"]/*[@code="a"]'));
					if (ZU.xpathText(xml, '//*[@tag="260"]/*[@code="b"]')) item.notes.push('publisher:' + ZU.xpathText(xml, '//*[@tag="260"]/*[@code="b"]'));
				}
				if (ZU.xpathText(xml, '//*[@tag="500"]/*[@code="e"]') != null && ZU.xpathText(xml, '//*[@tag="500"]/*[@code="e"]').match(/\d{4}/)) item.notes.push('second_publication_year:' + ZU.xpathText(xml, '//*[@tag="500"]/*[@code="e"]').match(/\d{4}/)[0]);
				item.notes.push('second_publisher:' + 'Université catholique de Louvain');
				item.notes.push('second_place:' + 'Louvain');

				item.volume = "1";						

				item.complete();
			});
			translator.translate();
 });
 }

/** BEGIN TEST CASES **/
var testCases = [
	{
		"type": "web",
		"url": "https://dial.uclouvain.be/pr/boreal/object/boreal:174097",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Analyse littéraire et exégèse biblique",
				"creators": [
					{
						"firstName": "Camille",
						"lastName": "Focant",
						"creatorType": "author"
					}
				],
				"date": "2014",
				"ISSN": "0001-4133",
				"abstractNote": "Cet article rappelle d'abord quelques étapes importantes des relations difficiles entre histoire et fiction dans l'approche de la Bible du 19e siècle à nos jours; il situe la démarche de l'auteur dans le champ de l'exégèse biblique telle qu'elle se développe aujourd'hui. Une seconde partie est consacrée à un exemple pratique de ce que peut apporter la lecture de l'évangile de Marc comme une œuvre littéraire en examinant son code architectural.",
				"language": "en",
				"libraryCatalog": "dial.uclouvain.be",
				"pages": "47-64",
				"publicationTitle": "Bulletin de la Classe des Lettres et des Sciences morales et politiques",
				"url": "https://dial.uclouvain.be/pr/boreal/object/boreal:174097",
				"volume": "6",
				"attachments": [
					{
						"title": "Snapshot",
						"mimeType": "text/html"
					}
				],
				"tags": [
					{
						"tag": "analyse littéraire"
					},
					{
						"tag": "exégèse biblique"
					}
				],
				"notes": [
					{
						"note": "doi:http://hdl.handle.net/2078.1/174097"
					}
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dial.uclouvain.be/pr/boreal/object/boreal:71352",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "Praising God or Singing of Love? From Theological into Erotic Allegorisation in the Interpretation of Canticles",
				"creators": [
					{
						"firstName": "Hans",
						"lastName": "Ausloos",
						"creatorType": "author"
					},
					{
						"firstName": "Bénédicte",
						"lastName": "Lemmelijn",
						"creatorType": "author"
					}
				],
				"date": "2010",
				"abstractNote": "In the history of the interpretation of Canticles, one generally distinguishes two tendencies,which can also be identified in the interpretation history of the rest of the Old Testamentliterature. Alongside a literal reading of the text, there is also the possibility of an allegoricalinterpretation, which was often, consciously or otherwise, a reaction against a literalreading of the Bible. Although this contrast between the terms ‘literal’ and ‘allegorical’ appearsfrequently in the literature on Canticles, the present article argues that this terminologyseems to be inadequate for Canticles at any rate: reading Canticles either ‘literally’ or‘allegorically’ is an expression of a false dilemma with respect to this book. After all, beinglove poetry, the book sings about love as a transcendent, even ‘divine’ reality. Againstthis background, this contribution will argue that the so-called ‘literal’ — anthropological— reading, according to which Canticles praises the love between two persons, is, in thecase of many authors, at least as allegorical as the so-called theological-allegorical reading,according to which Canticles is supposed to speak about the relationship betweenGod and Israel, or Christ and the Church. Therefore, in the first part of this contribution, weshall briefly consider the background of the theological-allegorical reading of Canticles.Then, we shall examine the anthropological interpretation, which has received renewedattention, especially since the beginning of the twentieth century, and which has rapidlydeveloped into an anthropological-allegorical interpretation. In the third part, the evolutionoutlined in the previous two parts will be illustrated in an analysis of Canticles 2:16",
				"language": "eng",
				"libraryCatalog": "uclouvain",
				"publicationTitle": "Acta Theologica",
				"shortTitle": "Praising God or Singing of Love?",
				"url": "http://hdl.handle.net/2078.1/71352",
				"attachments": [],
				"tags": [],
				"notes": [
					"LF:",
					"hdl:2078.171352",
					"issn:1015-8758",
					"773$g:Vol. 30, no. 1, p. 1-18 (2010)",
					"second_publication_year:2011",
					"second_publisher:Université catholique de Louvain",
					"second_place:Louvain"
				],
				"seeAlso": []
			}
		]
	},
	{
		"type": "web",
		"url": "https://dial.uclouvain.be/pr/boreal/object/boreal:265425",
		"items": [
			{
				"itemType": "journalArticle",
				"title": "La renaissance des homélies autour du concile Vatican II. Étude de prédications de quelques prêtres belges",
				"creators": [
					{
						"firstName": "Arnaud",
						"lastName": "Join-Lambert",
						"creatorType": "author"
					}
				],
				"date": "2022",
				"abstractNote": "Le concile Vatican II a profondément renouvelé le sens de l’homélie et son insertion dans la liturgie. Concrètement, les évêques ont restauré l’homélie «à partir du texte sacré» et «faisant partie de la liturgie elle-même» (selon les mots de la constitution sur la liturgie). Comment les premiers concernés, les curés et les autres prêtres, ont-ils reçu ce changement et modifié leurs pratiques? Pour contribuer à un début de réponse, l’article présente une analyse des prédications de trois prêtres belges. Autour de ces trois figures, prend corps l’esquisse d’une typologie de ce surgissement de la Parole de Dieu dans la prédication entre 1945 et 1975. En finale, de nouveaux enjeux sont évoqués.",
				"language": "fre",
				"libraryCatalog": "uclouvain",
				"publicationTitle": "Questions Liturgiques",
				"url": "http://hdl.handle.net/2078.1/265425",
				"attachments": [],
				"tags": [],
				"notes": [
					"abs:Le concile Vatican II a profondément renouvelé le sens de l’homélie et son insertion dans la liturgie. Concrètement, les évêques ont restauré l’homélie «à partir du texte sacré» et «faisant partie de la liturgie elle-même» (selon les mots de la constitution sur la liturgie). Comment les premiers concernés, les curés et les autres prêtres, ont-ils reçu ce changement et modifié leurs pratiques? Pour contribuer à un début de réponse, l’article présente une analyse des prédications de trois prêtres belges. Autour de ces trois figures, prend corps l’esquisse d’une typologie de ce surgissement de la Parole de Dieu dans la prédication entre 1945 et 1975. En finale, de nouveaux enjeux sont évoqués The Second Vatican Council profoundly renewed the meaning of the homily and its insertion in the liturgy. In concrete terms, the bishops restored the homily 'from the sacred text' and 'as part of the liturgy itself' (in the words of the constitution on the liturgy). How have the people primarily concerned, parish priests and other priests, received this change and modified their practices? In order to contribute to the beginning of an answer, the article presents an analysis of the preaching of three Belgian priests. Around these three figures, a typology of the emergence of the Word of God in preaching between 1945 and 1975 is sketched out. Finally, new issues are raised",
					"abs:undefined",
					"LF:",
					"hdl:2078.1265425",
					"issn:0779-2050",
					"773$g:Vol. 102, no.1-2, p. 101-117 (2022)",
					"orcid: 0000-0002-6261-1865 | Join-Lambert, Arnaud | taken from website",
					"place:Leuven",
					"publisher:Peeters Publishers",
					"second_publication_year:2022",
					"second_publisher:Université catholique de Louvain",
					"second_place:Louvain"
				],
				"seeAlso": []
			}
		]
	}
]
/** END TEST CASES **/
