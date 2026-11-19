import type { BatchDocumentInput } from './similarityEngine';

export interface SampleDocumentSet {
  id: string;
  title: string;
  subtitle: string;
  docATitle: string;
  docAText: string;
  docBTitle: string;
  docBText: string;
  answerKeyTitle?: string;
  answerKeyText?: string;
}

export interface BatchSampleSet {
  id: string;
  title: string;
  docs: BatchDocumentInput[];
  answerKeyTitle: string;
  answerKeyText: string;
}

export const DIRECT_SAMPLES: SampleDocumentSet[] = [
  {
    id: 'byklima-varmeoeer',
    title: 'Byklima og varmeøer (Dansk opgave)',
    subtitle: 'Elevopgave scannet mod publiceret fagartikel',
    docATitle: 'Elevbesvarelse — M. Lindberg.docx',
    docAText: `Afbødning af urbane varmeøer i tætbebyggede kystbyer

Når storbyernes befolkning vokser, absorberer tætte asfaltbelægninger og mørke tagmembraner indkommende solstråling gennem eftermiddagen og afgiver termisk energi langsomt efter solnedgang. Nye kommunale målinger viser, at nattetemperaturen i tætte erhvervskvarterer ofte forbliver 4 til 6 grader varmere end i omkringliggende landområder.

For at modvirke denne varmeophobning anvender byplanlæggere i stigende grad lyse overfladebelægninger kombineret med sammenhængende grønne trækorridorer. Højreflekterende kølige vejbelægninger kaster en væsentlig del af den kortbølgede solindstråling tilbage før den omdannes til mærkbar varme, mens gadetræernes kroner opfanger direkte sollys og køler luften gennem fordampning.

Nogle kritikere indvender, at reflekterende overflader kan øge behovet for opvarmning om vinteren på nordlige breddegrader. Imidlertid dokumenterer empiriske energimodeller fra mellemeuropæiske storbyer, at besparelserne på sommerkøling klart overstiger vinterens ekstra varmeforbrug, især når lyse tagmembraner kombineres med permeable regnbede der tilbageholder regnvand.`,
    docBTitle: 'Kildeartikel — Nordisk Byklimarapport (2025).pdf',
    docBText: `Kapitel 4: Termiske strategier i tætte byområder

1. Solabsorption og natlig varmeafgivelse
Tætte asfaltbelægninger og mørke tagmembraner absorberer indkommende solstråling gennem eftermiddagen og afgiver termisk energi langsomt efter solnedgang. Dermed oplever centrale bydele forhøjede nattetemperaturer, som belaster elnettet til køling under længerevarende hedebølger.

2. Overfladerefleksion og grøn infrastruktur
Moderne kommuner kombinerer to supplerende indgreb. For det første kaster højreflekterende kølige vejbelægninger en væsentlig del af den kortbølgede solindstråling tilbage før den omdannes til mærkbar varme, hvilket sænker overfladetemperaturen midt på dagen med op til 11 grader. For det andet opfanger gadetræernes kroner direkte sollys og køler omgivelserne gennem fordampning.

3. Sæsonmæssige energiafvejninger
Selvom kølige belægninger kan øge varmebehovet svagt i vinterhalvåret, dokumenterer empiriske energimodeller fra mellemeuropæiske storbyer, at besparelserne på sommerkøling klart overstiger vinterens ekstra varmeforbrug, særligt når lyse tagmembraner kobles med grønne regnbede.`,
  },
  {
    id: 'koelekaede-udbud',
    title: 'Kølekæde-udbud (Teknisk dokument)',
    subtitle: 'Tilbudsdokument sammenlignet med tidligere udbudsmateriale',
    docATitle: 'Tilbud — Nordstjerne Logistik.txt',
    docAText: `Ledelsesresumé: Temperaturstyret distributionsnetværk

Nordstjerne Logistik foreslår en dobbeltknudepunkts kølearkitektur udviklet til sikker transport af lægemidler på regionale ruter. Vores telemetri-gateways måler lastrummets luftfugtighed og kernetemperatur med tredive sekunders interval og sender krypterede diagnosepakker til redundante regionale vagtcentraler.

Ved mekanisk kompressorfejl eller motorvejsforsinkelser på over femogfyrre minutter omdirigerer automatiske eskaleringsprotokoller straks forsendelsen til nærmeste godkendte kølelager uden krav om manuel godkendelse fra en koordinator. Desuden gennemgår alle isolerede trailere kvartalsvise termografiske eftersyn før højsæsonen.`,
    docBTitle: 'Tidligere udbud — Meridian Fragt (2024).txt',
    docBText: `Afsnit 2: Automatiseret kølekædeovervågning og ruteomlægning

Meridian Fragt driver et landsdækkende netværk til biologiske lægemidler. Helt konkret måler vores telemetri-gateways lastrummets luftfugtighed og kernetemperatur med tredive sekunders interval og sender krypterede diagnosepakker til redundante regionale vagtcentraler.

Hvis der opstår kompressorfejl eller forsinkelse på over femogfyrre minutter, omdirigerer automatiske eskaleringsprotokoller straks forsendelsen til nærmeste godkendte kølelager uden krav om manuel godkendelse fra en koordinator. Alle trailere inspiceres årligt for tæthed i dørpakninger.`,
  },
];

export const ANSWER_KEY_SAMPLES: SampleDocumentSet[] = [
  {
    id: 'biologi-eksamen-facit',
    title: 'Biologieksamen — Celleånding',
    subtitle: 'To elevbesvarelser holdt op mod officiel rettevejledning',
    docATitle: 'Besvarelse A — Elev #408.docx',
    docAText: `Spørgsmål 3: Forklar iltens rolle og protongradienten under den oxidative fosforylering.

Under den oxidative fosforylering træder energirige elektroner båret af NADH og FADH2 ind i elektrontransportkæden i den indre mitokondriemembran. Når elektronerne passerer gennem proteinkomplekserne, frigives energi til at pumpe protoner fra mitokondriets matrix ud i det intermembranøse rum, hvilket opbygger en elektrokemisk protongradient.

Når jeg skal huske det visuelt, ser jeg altid de indre folder for mig som små vandkraftværker, der holder en lilla sø af brintioner tilbage bag en dæmning. Når ionerne endelig strømmer tilbage gennem ATP-syntase som turbiner i en smal kløft, drejer rotoren mekanisk rundt og låser ADP sammen med uorganisk fosfat.

Til sidst fungerer molekylær ilt som den endelige elektronacceptor og binder sig til elektroner og protoner under dannelse af vand. Uden ilt til stede går hele kæden i stå, og dannelsen af ATP stopper.`,
    docBTitle: 'Besvarelse B — Elev #419.docx',
    docBText: `Besvarelse af spørgsmål 3:

I den oxidative fosforylering træder energirige elektroner båret af NADH og FADH2 ind i elektrontransportkæden i den indre mitokondriemembran. Den energi der frigives pumper protoner fra mitokondriets matrix ud i det intermembranøse rum og opbygger en elektrokemisk protongradient over membranen.

Jeg ser stadig de indre folder for mig som små vandkraftværker, der holder en lilla sø af brintioner tilbage bag en dæmning. Når ionerne endelig strømmer tilbage gennem ATP-syntase som turbiner i en smal kløft, drejer rotoren mekanisk rundt og låser ADP sammen med uorganisk fosfat til ATP.

Afslutningsvis fungerer molekylær ilt som den endelige elektronacceptor og binder sig til elektroner og protoner under dannelse af vand. Hvis ilt mangler, stopper elektrontransportkæden fuldstændigt.`,
    answerKeyTitle: 'Facit — Officiel rettevejledning.txt',
    answerKeyText: `Officielt facit — Spørgsmål 3 (10 point)

1. Elektronoverførsel og protonpumpning (4 point):
Energirige elektroner båret af NADH og FADH2 træder ind i elektrontransportkæden i den indre mitokondriemembran. Under elektronernes transport gennem proteinkomplekserne pumpes protoner fra mitokondriets matrix ud i det intermembranøse rum, hvilket opbygger en elektrokemisk protongradient.

2. Kemiosmose og ATP-syntese (3 point):
Protonerne strømmer tilbage langs koncentrationsgradienten ind i matrix gennem ATP-syntase, hvilket driver fosforyleringen af ADP og uorganisk fosfat til ATP.

3. Slutacceptor for elektroner (3 point):
Molekylær ilt fungerer som den endelige elektronacceptor og binder sig til elektroner og protoner under dannelse af vand. Uden ilt stopper elektrontransportkæden, og ATP-produktionen ophører.`,
  },
  {
    id: 'oekonomi-pengepolitik',
    title: 'Samfundsøkonomi — Pengepolitik',
    subtitle: 'Afslører fælles opdigtet eksempel uden for facit',
    docATitle: 'Besvarelse A — Kandidat 12.txt',
    docAText: `Når en centralbank fører ekspansiv pengepolitik via markedsoperationer, opkøber den statsobligationer fra forretningsbankerne, hvilket øger bankernes reserver og sænker den korte interbankrente. Lavere lånerenter reducerer finansieringsomkostningerne for virksomheder og husholdninger, så investeringer og samlet efterspørgsel stiger.

Forestil dig for eksempel et lille bageri i Odense ved navn Gyldne Kringle ApS, som pludselig finansierer tre industrielle stenovne til 2,1 procent i rente i stedet for 6,4 procent og ansætter fire natbagere allerede inden efterårsferien.

Hvis økonomien derimod allerede befinder sig tæt på fuld beskæftigelse, presser vedvarende pengepolitisk lempelse primært lønninger og forbrugerpriser op i stedet for at øge den reale produktion.`,
    docBTitle: 'Besvarelse B — Kandidat 27.txt',
    docBText: `Ekspansiv pengepolitik gennemføres ved at centralbanken opkøber statsobligationer fra forretningsbankerne, hvorved bankernes reserver øges og den korte interbankrente falder. Fordi lån bliver billigere for både virksomheder og husholdninger, vokser investeringerne og den samlede efterspørgsel.

Tag som eksempel et bageri i Odense ved navn Gyldne Kringle ApS, som pludselig finansierer tre industrielle stenovne til 2,1 procent i rente i stedet for 6,4 procent og hyrer fire natbagere allerede inden efterårsferien.

Befinder økonomien sig derimod allerede tæt på fuld beskæftigelse, presser en fortsat pengepolitisk lempelse primært lønninger og forbrugerpriser i vejret frem for at hæve den reale produktion.`,
    answerKeyTitle: 'Facit — Økonomisk rettevejledning.txt',
    answerKeyText: `Modelbesvarelse: Den pengepolitiske transmissionsmekanisme

Når centralbanken opkøber statsobligationer fra forretningsbankerne, øges bankernes reserver og den korte interbankrente sænkes. Lavere renter reducerer låneomkostningerne for virksomheder og husholdninger, hvilket stimulerer investeringer og den samlede efterspørgsel.

Forbehold: Hvis økonomien allerede befinder sig tæt på fuld beskæftigelse, presser vedvarende lempelser primært lønninger og forbrugerpriser op i stedet for at øge den reale produktion.`,
  },
];

export const BATCH_SAMPLES: BatchSampleSet[] = [
  {
    id: 'klasse-vedvarende-energi',
    title: '3.g Fysik/Samfundsfag — Elnettets balance (5 besvarelser)',
    docs: [
      {
        id: 'batch-elev-1',
        title: '01_Sofie_Hansen.docx',
        text: `Når andelen af vind- og solenergi i det danske elnet vokser, svinger elproduktionen i takt med vejret, fordi hverken vindmøller eller solceller kan skrues op efter behov på vindstille dage. Derfor skal elnettet balanceres løbende gennem fleksibelt elforbrug, batterilagre og stærke udlandsforbindelser til vandkraft i Norge og Sverige.

Hvis man kigger på vores lokale netværk i Midtjylland, minder effektbalancen faktisk om en gammeldags mølledam med træsluser, hvor mølleren hele tiden må regulere vandstanden med en skovlfuld grus, før møllehjulet knækker i stormvejr.

Endelig spiller varmepumper og elbiler en stigende rolle, når deres opladning flyttes automatisk til timer med lav belastning og overskud af grøn strøm.`,
      },
      {
        id: 'batch-elev-2',
        title: '02_Jonas_Mikkelsen.docx',
        text: `I takt med at andelen af vind- og solenergi i elnettet vokser, varierer produktionen med vejret. For at sikre forsyningssikkerheden balanceres nettet via udlandsforbindelser til norsk og svensk vandkraft, store batteriparker og fleksibelt elforbrug hos erhverv og private.

Et godt eksempel er elbiler og varmepumper, som via smart styring automatisk lader eller varmer vand op i nattetimerne, når elprisen er lav og der er rigeligt med vindstrøm i systemet. På den måde fungerer bygninger og køretøjer som en decentral buffer i energisystemet uden at forbrugerne mærker nedsat komfort.`,
      },
      {
        id: 'batch-elev-3',
        title: '03_Emma_Krogh.docx',
        text: `Når andelen af vind- og solenergi stiger i det danske elnet, varierer elproduktionen naturligt med vejrforholdene. Balancen mellem produktion og forbrug opretholdes ved hjælp af udlandsforbindelser til norsk og svensk vandkraft, batterilagring og intelligent styring af forbruget.

Ser man på effektbalancen i hverdagen, minder det faktisk om en gammeldags mølledam med træsluser, hvor mølleren hele tiden må regulere vandstanden med en skovlfuld grus, før møllehjulet knækker i stormvejr.

Derudover kan varmepumper og elbiler planlægge deres forbrug til timer med overskudsstrøm fra vindmøller.`,
      },
      {
        id: 'batch-elev-4',
        title: '04_Mikkel_Dalgaard.docx',
        text: `Udfordringen ved meget vind- og solenergi er, at strømmen produceres når det blæser eller solen skinner, og ikke nødvendigvis når forbrugerne tænder komfuret. Systemoperatøren bruger derfor kabelforbindelser til nabolande med vandkraft, hurtige batterisystemer og fleksible tariffer til at holde frekvensen præcis på 50 hertz.

Samtidig bliver sektor-kobling mellem el og varme vigtigere, fordi store elkedler og varmepumper på fjernvarmeværker kan aftage billig overskudsstrøm og lagre energien som varmt vand i store akkumuleringstanke.`,
      },
      {
        id: 'batch-elev-5',
        title: '05_Freja_Nissen.docx',
        text: `Med stigende produktion fra vedvarende energikilder som vind og sol bliver elnettet mere afhængigt af vejret. For at opretholde forsyningssikkerheden benyttes udlandsforbindelser til vandkraft i Norge og Sverige, batterilagre samt fleksibelt forbrug.

Et tydeligt eksempel er eldrevne biler og husstandenes varmepumper, hvor intelligent styring automatisk placerer opladning og opvarmning i nattetimerne, når priserne falder og vindstrømmen dominerer. Dermed optræder køretøjer og bygninger som en fleksibel buffer uden tab af hverdagskomfort.`,
      },
    ],
    answerKeyTitle: 'Opgaveoplæg og facit — Elnettets balance.txt',
    answerKeyText: `Fagligt facit: Elnettets balance ved høj andel af vedvarende energi

1. Vejrafhængighed: Produktionen fra vind- og solenergi varierer med vejret og følger ikke automatisk døgnets forbrugsmønster.
2. Balancering: Forsyningssikkerheden opretholdes gennem udlandsforbindelser til vandkraft i Norge og Sverige, batterilagre og fleksibelt elforbrug.
3. Fleksibelt forbrug: Varmepumper og elbiler kan flytte forbrug til timer med overskud af strøm og lave elpriser.`,
  },
];
