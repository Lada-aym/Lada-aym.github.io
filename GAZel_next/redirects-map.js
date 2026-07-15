/**
 * Маппинг старых страниц на новые SEO-страницы
 * old: старая страница (в корне GAZel_next/)
 * new: новая страница (в подпапках)
 */

const REDIRECTS = [
  // ОПИСАНИЕ → ПЕРЕД НАЧАЛОМ ЭКСПЛУАТАЦИИ
  { old: 'opisanie1.html', new: 'pered-nachalom-ekspluatacii/klyuchi.html' },
  { old: 'opisanie2.html', new: 'pered-nachalom-ekspluatacii/otpiranie-i-zapiranie-zamkov-dverey-vydvizhnaya-podnozhka.html' },
  { old: 'opisanie3.html', new: 'pered-nachalom-ekspluatacii/sidenya.html' },
  { old: 'opisanie4.html', new: 'pered-nachalom-ekspluatacii/sistema-passivnoy-bezopasnosti.html' },
  { old: 'opisanie5.html', new: 'pered-nachalom-ekspluatacii/zerkala-zadnego-vida.html' },
  { old: 'opisanie6.html', new: 'pered-nachalom-ekspluatacii/panel-priborov-i-organy-upravleniya.html' },
  { old: 'opisanie7.html', new: 'pered-nachalom-ekspluatacii/kombinaciya-priborov.html' },
  { old: 'opisanie8.html', new: 'pered-nachalom-ekspluatacii/signalizatory-kombinacii-priborov.html' },
  { old: 'opisanie9.html', new: 'pered-nachalom-ekspluatacii/vyklyuchatel-priborov-i-startera-zazhiganiya.html' },
  { old: 'opisanie10.html', new: 'pered-nachalom-ekspluatacii/vnutrennee-osveschenie.html' },
  { old: 'opisanie11.html', new: 'pered-nachalom-ekspluatacii/vyklyuchateli-na-paneli-priborov.html' },
  { old: 'opisanie12.html', new: 'pered-nachalom-ekspluatacii/otoplenie-ventilyaciya-i-kondicionirovanie-vozduha.html' },
  
  // ЭКСПЛУАТАЦИЯ → ЭКСПЛУАТАЦИЯ АВТОМОБИЛЯ
  { old: 'ekspluatatsiya1.html', new: 'ekspluataciya-avtomobilya/pusk-i-ostanovka-dvigatelya.html' },
  { old: 'ekspluatatsiya2.html', new: 'ekspluataciya-avtomobilya/dvizhenie-avtomobilya.html' },
  { old: 'ekspluatatsiya3.html', new: 'ekspluataciya-avtomobilya/tormozhenie.html' },
  { old: 'ekspluatatsiya7.html', new: 'ekspluataciya-avtomobilya/sazhevyy-filtr.html' },
  { old: 'ekspluatatsiya9.html', new: 'pered-nachalom-ekspluatacii/sistema-era-glonass.html' },
  
  // ОБСЛУЖИВАНИЕ → ТЕХНИЧЕСКОЕ ОБСЛУЖИВАНИЕ + ПРАКТИЧЕСКИЕ СОВЕТЫ
  { old: 'obsluzhivanie3.html', new: 'tehnicheskoe-obsluzhivanie/dvigatel.html' },
  { old: 'obsluzhivanie4.html', new: 'tehnicheskoe-obsluzhivanie/sistema-ohlazhdeniya.html' },
  { old: 'obsluzhivanie6.html', new: 'prakticheskie-sovety/zamena-lamp.html' },
  { old: 'obsluzhivanie7.html', new: 'prakticheskie-sovety/predohraniteli-i-rele.html' },
  { old: 'obsluzhivanie8.html', new: 'ekspluataciya-avtomobilya/kolesa-i-shiny.html' },
  { old: 'obsluzhivanie9.html', new: 'prakticheskie-sovety/zamena-kolesa.html' },
  { old: 'obsluzhivanie12.html', new: 'prakticheskie-sovety/ustanovka-karkasa-tenta-i-tenta-na-platformu-avtomobilya.html' },
  
  // ТЕХНИЧЕСКАЯ ХАРАКТЕРИСТИКА → ТЕХНИЧЕСКАЯ ХАРАКТЕРИСТИКА
  { old: 'tehnicheskaya-harakteristika1.html', new: 'tehnicheskaya-harakteristika/osnovnye-razmery.html' },
  { old: 'tehnicheskaya-harakteristika3.html', new: 'tehnicheskoe-obsluzhivanie/zapravochnye-obemy-goryuchesmazochnye-i-ekspluatacionnye-materialy.html' },
  { old: 'tehnicheskaya-harakteristika4.html', new: 'prakticheskie-sovety/identifikacionnye-nomera.html' }
];

module.exports = REDIRECTS;
