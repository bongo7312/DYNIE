// Logika mapy: zoom kołem myszy, zakładki miast, dodawanie punktów
(function () {
  const STORAGE_KEY = 'gta_sa_map_markers';
  const STORAGE_EDITOR_KEY = 'gta_sa_is_editor';
  // Lekkie zaciemnienie hasła (Base64 → UTF-8)
  function b64utf8decode(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(Array.from(bin, c => c.charCodeAt(0)));
    return new TextDecoder('utf-8').decode(bytes);
  }
  const EDIT_CODE = b64utf8decode('ZHluNGxpZmU=');
  // Discord OAuth2 (implicit flow) — konfiguracja z query/localStorage
  function getQueryParam(name) {
    try {
      const u = new URL(window.location.href);
      return u.searchParams.get(name);
    } catch (_) { return null; }
  }
  function getStored(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function getDiscordClientId() {
    return getQueryParam('dcid') || getStored('discord_client_id') || '1440102111848300615';
  }
  function getDiscordRedirectUri() {
    // Priorytet: query (?redirect_uri=), potem localStorage('discord_redirect_uri'), na końcu stała
    return getQueryParam('redirect_uri') || getStored('discord_redirect_uri') || 'https://bongo7312.github.io/DYNIE';
  }
  const DISCORD_CLIENT_ID = getDiscordClientId();
  const DISCORD_REDIRECT_URI = getDiscordRedirectUri();
  const DISCORD_SCOPES = ['identify'];
  const EDITOR_DISCORD_IDS = [
    // TODO: wpisz ID kont Discord, które mają uprawnienia edytora
    // '123456789012345678',
  ];
  const STORAGE_TOKEN_KEY = 'discord_access_token';
  const STORAGE_TOKEN_EXP_KEY = 'discord_access_token_exp_ms';
  const STORAGE_USER_KEY = 'discord_user';
  const STORAGE_OAUTH_STATE = 'discord_oauth_state';
  // Tryb localhost: nie zapisujemy markerów do localStorage, tylko korzystamy z danych w kodzie
  const IS_LOCALHOST = (
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.protocol === 'file:' ||
    /\.local$/.test(location.hostname)
  );
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
  // Wersja bez bazy: korzystamy ze statycznego pliku markers.json (jeśli istnieje)
  // Możesz dodać swoje punkty tutaj — przy pierwszym uruchomieniu zostaną wczytane,
  // potem używana będzie pamięć przeglądarki (localStorage).
  // Przykład punktu z obrazkiem z Imgur:
  // { xPct: 72, yPct: 78, imgUrl: 'https://i.imgur.com/XXXXXXX.jpg' }
  const INITIAL_MARKERS = [
    // Dodaj swoje wpisy lub zostaw pustą tablicę
    // { xPct: 72, yPct: 78, imgUrl: 'https://i.imgur.com/vt0tq1n.jpg' },
  ];

  const HIDDEN_MARKERS_PARTS = [
    [
      {"id":"25jle8uvshvmhp8w274","xPct":65.40062111041529,"yPct":28.85104511184391,"imgId":"2tmCGL5","imgExt":"jpeg"},
      {"id":"j1000qmp1umhp8wq8z","xPct":66.71200744158284,"yPct":18.167064543866687,"imgId":"KafrBBh","imgExt":"png"},
      {"id":"77edimqw56mhp8yaas","xPct":60.46894876022545,"yPct":14.905512446671102,"imgId":"3Ke9lhO","imgExt":"jpeg"},
      {"id":"rcbchrw9c8rmhp8z4hr","xPct":62.511662638459434,"yPct":5.879377923304239,"imgId":"b5avy30","imgExt":"jpeg"},
      {"id":"cs0iy7sscemhp8zsvr","xPct":47.51169015910603,"yPct":47.575161943716,"imgId":"usOJTHl","imgExt":"png"},
      {"id":"4rfcx9kv9umhp90p8t","xPct":90.72962126697718,"yPct":8.174763826984423,"imgId":"gX5JwUj","imgExt":"png"},
      {"id":"dounzb1h86rmhp91za3","xPct":86.29578824024424,"yPct":15.840034483370191,"imgId":"WSUKhBG","imgExt":"jpeg"},
      {"id":"gttm1ve95q7mhp92zb9","xPct":84.09139667893069,"yPct":25.23374852305863,"imgId":"PhkaYx5","imgExt":"png"},
      {"id":"2v84hmy24f7mhp944qr","xPct":47.530288000508826,"yPct":26.28353085003327,"imgId":"9O0nK9W","imgExt":"jpeg"},
      {"id":"mu4oa5a4ozimhp94t4r","xPct":44.85375528396415,"yPct":28.395526427159574,"imgId":"LdU6185","imgExt":"jpeg"},
      {"id":"3nhnxvrtp0mmhp95nnm","xPct":69.24398337508318,"yPct":13.605348423617365,"imgId":"IMBin6v","imgExt":"jpeg"},
      {"id":"otagyhhuz5nmhp966v3","xPct":88.10518513444752,"yPct":16.277994613292105,"imgId":"7eyVdnH","imgExt":"jpeg"},
      {"id":"obm7inu15imhp96tyr","xPct":75.71224044972405,"yPct":33.91916329895495,"imgId":"gKd5pYb","imgExt":"png"},
      {"id":"6fzwr7m1guqmhp97hnm","xPct":76.4386876687933,"yPct":31.614572121218053,"imgId":"lG1JxmC","imgExt":"jpeg"},
      {"id":"3s5c4sy5pt7mhp98lxw","xPct":69.97210323789581,"yPct":9.906096878180163,"imgId":"vzYZ0wH","imgExt":"jpeg"},
      {"id":"1ht53pgjitehmhp99f66","xPct":74.47526077341578,"yPct":9.292366200731927,"imgId":"DcujNrE","imgExt":"jpeg"},
      {"id":"01czeg7wozq5mhp9ayry","xPct":77.2808500332694,"yPct":10.11901303622451,"imgId":"AE4C8v7","imgExt":"jpeg"},
      {"id":"pwgaqd44b6mhp9cpsy","xPct":29.34318919037927,"yPct":31.973702799033234,"imgId":"0eQuuxm","imgExt":"jpeg"},
      {"id":"qdaa3cwe1mqmhp9dw0f","xPct":21.616281841388115,"yPct":40.92095397569376,"imgId":"dgW9ey0","imgExt":"png"},
      {"id":"j7z2thd1b8bmhp9f5dc","xPct":80.66017444420525,"yPct":12.560204472288545,"imgId":"5H5SwFX","imgExt":"jpeg"},
      {"id":"3y8cipy7ojtmhp9fy4w","xPct":27.360117904565733,"yPct":51.27033469998826,"imgId":"CwCJXYu","imgExt":"png"},
      {"id":"5lh71nek5pgmhp9h1xp","xPct":85.02480766363777,"yPct":15.562995476002053,"imgId":"ULnjFSz","imgExt":"jpeg"},
      {"id":"trufq86sabqmhp9i5nu","xPct":77.12536449567497,"yPct":9.04649922850454,"imgId":"VofE3pr","imgExt":"jpeg"},
      {"id":"2fewuu7ap3kmhp9jee7","xPct":90.80683196994012,"yPct":15.645947798837529,"imgId":"W7d5qgM","imgExt":"jpeg"},
      {"id":"0wvwerhts06bmhp9k3mf","xPct":58.50316884956358,"yPct":30.037574856158756,"imgId":"ASHnfVK","imgExt":"jpeg"},
      {"id":"yjynst6buumhp9m3ji","xPct":59.994722463568685,"yPct":26.156646134907863,"imgId":"emwQwUC","imgExt":"jpeg"},
      {"id":"738us3ehu3qmhp9n768","xPct":57.926955311362484,"yPct":27.761207630435635,"imgId":"5PxDuu9","imgExt":"jpeg"},
      {"id":"k7xjp0q4y8jmhp9o6t4","xPct":50.86778408646134,"yPct":26.979297134917235,"imgId":"zoXkW0B","imgExt":"jpeg"},
      {"id":"zlxwatyr4mlmhp9p06l","xPct":51.393832072683864,"yPct":26.20275010763631,"imgId":"sJVNNYf","imgExt":"jpeg"},
      {"id":"1qnla7yvuxtmhp9pj6n","xPct":37.34831995626052,"yPct":21.673619197424557,"imgId":"c1VqTkX","imgExt":"jpeg"},
      {"id":"v0ebrhtnj9mhp9rknk","xPct":38.20001669585894,"yPct":21.94916814258875,"imgId":"vFCCOSk","imgExt":"jpeg"},
      {"id":"alhio0v8k75mhp9s4md","xPct":47.71898025607656,"yPct":25.7567535666758,"imgId":"9OUCJVi","imgExt":"jpeg"},
      {"id":"ki0jdraxdckmhp9t4h6","xPct":47.71898025607656,"yPct":27.33489752534346,"imgId":"z8bLn6B","imgExt":"png"},
      {"id":"djiaeb17w7kmhp9umy6","xPct":59.43590013307761,"yPct":31.341276811225487,"imgId":"UgC0Yql","imgExt":"jpeg"},
      {"id":"naq9jpha0hmhp9vacc","xPct":78.94232039414459,"yPct":20.07367429987475,"imgId":"7CboKaj","imgExt":"jpeg"},
      {"id":"pr8w9tyvg6omhp9vx7s","xPct":18.585054622367803,"yPct":78.75428710517046,"imgId":"auJ8Fgp","imgExt":"jpeg"},
      {"id":"ytjgwy3wo1lmhp9xbeb","xPct":36.69505625220165,"yPct":15.045892207131395,"imgId":"67mI2p5","imgExt":"jpeg"},
      {"id":"z7krsrupdpmhp9yxeb","xPct":40.40627813221653,"yPct":10.223100708442601,"imgId":"CftUmei","imgExt":"jpeg"},
      {"id":"d4m7p875404mhpa0exb","xPct":48.17174840502564,"yPct":11.099847352146854,"imgId":"9zQtK7y","imgExt":"png"},
      {"id":"4fpglcff6qqmhpa1i75","xPct":37.926337625738775,"yPct":15.258131433715604,"imgId":"Bsqcepg","imgExt":"png"},
      {"id":"m7fgitx2mrmhpa2ctj","xPct":36.97444126971701,"yPct":10.273200516654272,"imgId":"jY7DelA","imgExt":"png"},
      {"id":"d1jwxle2g0kmhpa30ww","xPct":33.31715527026498,"yPct":10.949547927511839,"imgId":"MTQYUgR","imgExt":"png"},
      {"id":"8jkaz1kk3e4mhpa3ouc","xPct":37.56128312874281,"yPct":3.5078336947201945,"imgId":"QhH2sXk","imgExt":"png"},
      {"id":"wdf9is8jvbmhpa3zns","xPct":38.51317948476457,"yPct":3.2573346536618364,"imgId":"hF7BwVY","imgExt":"png"},
      {"id":"hxzxm2sah4amhpa5k7h","xPct":19.3342778521175,"yPct":85.6233120670085,"imgId":"DoI0kW3","imgExt":"png"},
      {"id":"tgu33ynjqumhpa6cpk","xPct":14.674995688432032,"yPct":76.63039649301344,"imgId":"dENDIGT","imgExt":"jpeg"},
      {"id":"fwprxgse3rhmhpa7k07","xPct":79.58903724216212,"yPct":72.04181792829465,"imgId":"F5Mv4FV","imgExt":"jpeg"},
      {"id":"wggvn09mmnhmhpa8lic","xPct":81.6681792829465,"yPct":72.41756648988219,"imgId":"wFYUzCw","imgExt":"jpeg"},
      {"id":"epan33chpmqmhpa9a9o","xPct":7.79286860542487,"yPct":58.52818664624838,"imgId":"GT5APuJ","imgExt":"jpeg"},
      {"id":"5aekgcmjh8fmhpaahfd","xPct":82.36486750949157,"yPct":66.51023523425575,"imgId":"4XCZLqT","imgExt":"png"},
      {"id":"ks8bvv78q7emhpabejr","xPct":59.15126631668558,"yPct":27.840072630044226,"imgId":"ehNwEDe","imgExt":"jpeg"},
      {"id":"0awbo5ajnggmhpad0pt","xPct":58.52501871403969,"yPct":26.712826945281616,"imgId":"IBAyAmc","imgExt":"jpeg"},
      {"id":"bqog6zmjyd7mhpaenir","xPct":54.47493052565658,"yPct":46.772540632705784,"imgId":"WyHx9K5","imgExt":"jpeg"},
      {"id":"ljkt1h0fm5mhpafphh","xPct":60.170655529570624,"yPct":50.82383055599045,"imgId":"oHNYLY9","imgExt":"png"},
      {"id":"g9ti1yc0npomhpaiu1c","xPct":55.441168196406906,"yPct":45.207686088496615,"imgId":"oX7FgUW","imgExt":"jpeg"},
      {"id":"rh4agfe44ynmhpajll1","xPct":84.10707427394418,"yPct":43.62923328701711,"imgId":"dGzeWCD","imgExt":"jpeg"},
      {"id":"ligtadxyqqgmhpakc88","xPct":84.2573736985792,"yPct":42.902786067947865,"imgId":"035IHMd","imgExt":"jpeg"},
      {"id":"usf653jepsmhpalhbd","xPct":77.78483869231673,"yPct":59.323891101412976,"imgId":"mKUbX2F","imgExt":"jpeg"},
      {"id":"784vfrz3sujmhpaoluw","xPct":66.43932370151474,"yPct":17.61090438348859,"imgId":"yg4hUrk","imgExt":"jpeg"},
      {"id":"lf3uw45sszmhpapvlt","xPct":21.295010399746566,"yPct":56.82839225605699,"imgId":"SgstDqZ","imgExt":"jpeg"},
      {"id":"aov8jwal5u7mhpaqmfm","xPct":24.260364657741007,"yPct":32.7677315526048,"imgId":"eVu5CvK","imgExt":"jpeg"},
      {"id":"6twh7ybet4tmhparkcn","xPct":32.13017640428686,"yPct":17.201124248992134,"imgId":"t02ugZT","imgExt":"jpeg"},
      {"id":"lvbzg3tjn19mhpas9pa","xPct":74.30285309601159,"yPct":48.86348291518259,"imgId":"yBfWvxk","imgExt":"jpeg"},
      {"id":"29uhzg4wjcjmhpatb79","xPct":62.38796650553837,"yPct":52.530633537516145,"imgId":"lfC7X4S","imgExt":"jpeg"},
      {"id":"mgmesvnq1ndmhpau5i6","xPct":50.25627226114525,"yPct":48.94028080844651,"imgId":"qbkpFUg","imgExt":"jpeg"},
      {"id":"mnrg9cnib9mhpaw7fn","xPct":54.364456534502324,"yPct":44.5314976858194,"imgId":"ed7GxYI","imgExt":"jpeg"},
      {"id":"7oa9gk6u3tmhpay9ge","xPct":69.98426736369329,"yPct":40.91407687189322,"imgId":"YCd9GKl","imgExt":"jpeg"},
      {"id":"7q1lr26zpt6mhpazkrq","xPct":68.33584178930681,"yPct":41.09341669439117,"imgId":"n75ZTF2","imgExt":"jpeg"},
      {"id":"cvoen5e5rummhpb0agb","xPct":70.08933507671533,"yPct":38.813875420760105,"imgId":"U5yVYwk","imgExt":"jpeg"},
      {"id":"1syo18seb39mhpb13ec","xPct":70.54023335062037,"yPct":39.66557216035852,"imgId":"mwr8jSh","imgExt":"jpeg"},
      {"id":"w0cjrfhahgmhpb1ur3","xPct":50.191173700536226,"yPct":49.82935364397824,"imgId":"GVEzuv6","imgExt":"jpeg"},
      {"id":"1jvxgmsr7nimhpb3kzs","xPct":38.513869794316804,"yPct":46.05063432032565,"imgId":"XAjfDsl","imgExt":"jpeg"},
      {"id":"m1jlf5tlxpmhpb3tby","xPct":39.06496768464519,"yPct":46.05063432032565,"imgId":"aLEmS13","imgExt":"jpeg"},
      {"id":"wdncjtn3rusmhpb4d1j","xPct":41.510817754608794,"yPct":51.85062282281107,"imgId":"qYh337m","imgExt":"jpeg"},
      {"id":"qno8xriwqprmhpb57xa","xPct":49.69512016125876,"yPct":60.69607665662061,"imgId":"ckwflmS","imgExt":"jpeg"},
      {"id":"tlrfd0peyymhpb638w","xPct":17.050965485439743,"yPct":81.89935271439195,"imgId":"8gzv6VW","imgExt":"jpeg"},
      {"id":"gwt0atmgyqmmhpb78xs","xPct":8.459027261340953,"yPct":66.40104248209323,"imgId":"FkryYh0","imgExt":"jpeg"},
      {"id":"kthpak4fjkmhpb8d4g","xPct":15.688292518175858,"yPct":45.48915197267995,"imgId":"cLejPKp","imgExt":"jpeg"},
      {"id":"bulh417y944mhpch9aa","xPct":18.81309375795041,"yPct":41.207997377588164,"imgId":"gs1XxZG","imgExt":"jpeg"},
      {"id":"0taiyziytq7mhpciav9","xPct":19.138742511326274,"yPct":44.48953481545266,"imgId":"7DbNTsw","imgExt":"jpeg"},
      {"id":"wa5fotwngbmhpcjadx","xPct":22.59562927793162,"yPct":47.37027378762379,"imgId":"4BxNQ6B","imgExt":"jpeg"},
      {"id":"be9etusiw1emhpcls9e","xPct":24.29918979216408,"yPct":41.19444804591178,"imgId":"nlYTDmE","imgExt":"jpeg"},
      {"id":"ju3f9afmxxjmhpcmlmu","xPct":19.54966513488786,"yPct":29.206397816450743,"imgId":"9j19YsB","imgExt":"jpeg"},
      {"id":"4si8yfyjzujmhpcn7iu","xPct":24.522521368253162,"yPct":31.110224164840112,"imgId":"Pwri3OB","imgExt":"jpeg"},
      {"id":"10ls8kleum2mhpcoc7i","xPct":85.24995908572451,"yPct":5.969257573663757,"imgId":"KO067NV","imgExt":"jpeg"},
      {"id":"gpf9zg2ia4mhpcozpx","xPct":11.373014232455283,"yPct":41.97389697248425,"imgId":"B2aoqAH","imgExt":"jpeg"},
      {"id":"esw1cy43h9rmhpcph0g","xPct":9.118947904027555,"yPct":32.64276488316568,"imgId":"kUNRfwx","imgExt":"jpeg"},
      {"id":"0yj8weij7vrmhpcqbym","xPct":21.537247513356686,"yPct":32.528179613194254,"imgId":"6R22Hm3","imgExt":"jpeg"},
      {"id":"hmptlkeeecmhpcr4ml","xPct":18.835436318446906,"yPct":27.875279181670514,"imgId":"r8WG6aX","imgExt":"jpeg"},
      {"id":"ul0gibcrgeimhpcrstf","xPct":26.776255919996867,"yPct":30.781068057947476,"imgId":"3EgxN1z","imgExt":"png"},
      {"id":"qf47wef4slmhpcsgan","xPct":28.17905054992368,"yPct":34.13775520812948,"imgId":"0atvsoG","imgExt":"png"},
      {"id":"qcmt0j7855mhpct7yd","xPct":22.091923852205568,"yPct":36.6677955228189,"imgId":"ckyqZOT","imgExt":"jpeg"},
      {"id":"kdjeci7drumhpctuu1","xPct":12.57726345086892,"yPct":41.2150931176367,"imgId":"99y1Bcg","imgExt":"png"},
      {"id":"wr49ax5uh2rmhpcumhu","xPct":13.58864339113077,"yPct":30.161361195643664,"imgId":"mFrwbsk","imgExt":"png"},
      {"id":"yain8lyfgqkmhpcv02a","xPct":11.550577444322673,"yPct":26.950464670828605,"imgId":"er9V3li","imgExt":"png"},
      {"id":"173i7mtl8g5mhpcvxkp","xPct":8.744988184469058,"yPct":27.050664287251948,"imgId":"uGdkNIB","imgExt":"jpeg"},
      {"id":"q0nml7boe7jmhpcwmwp","xPct":7.220562999041058,"yPct":46.624341950761284,"imgId":"RMTxDNW","imgExt":"png"},
      {"id":"73yamvrxtdnmhpcxcfk","xPct":18.051918922951973,"yPct":26.25348289071979,"imgId":"M9kLdPv","imgExt":"jpeg"},
      {"id":"plg3r4y6r6dmhpcxvez","xPct":13.793354321798724,"yPct":15.381263089957306,"imgId":"A7hulBw","imgExt":"png"},
      {"id":"yhr2lcl2opmhpcyle0","xPct":9.589673274883557,"yPct":25.622250993189553,"imgId":"miruvv5","imgExt":"png"},
      {"id":"iel5h2r9abmhpczcy1","xPct":7.261175828799561,"yPct":25.872688877255467,"imgId":"xT0KErM","imgExt":"png"},
      {"id":"j462pbrhmkimhpd05kd","xPct":6.91047717131786,"yPct":37.4958443823633,"imgId":"HUM1TyB","imgExt":"jpeg"},
      {"id":"t4fevi38q68mhpd0th6","xPct":22.463958273195626,"yPct":45.210129310344826,"imgId":"6bdT3ud","imgExt":"png"},
      {"id":"6bo9h4hshsmhpd1o8n","xPct":21.03140350405104,"yPct":54.82887661943716,"imgId":"JC8y8Zw","imgExt":"jpeg"},
      {"id":"f4h5dsku0bomhpd28cb","xPct":17.481693418773727,"yPct":33.81038794326588,"imgId":"rvPMSzN","imgExt":"png"},
      {"id":"p63r2iuyv5omhpd2rqq","xPct":16.792046655446395,"yPct":4.994111728321069,"imgId":"iP1droZ","imgExt":"jpeg"},
      {"id":"wh2zqc9ko6mhpd3nau","xPct":11.621416353135151,"yPct":34.288629508493486,"imgId":"IJX2i5c","imgExt":"png"},
      {"id":"xer4n6m1dpmhpd40st","xPct":24.12131850194724,"yPct":46.61318232856472,"imgId":"xYwsOW4","imgExt":"png"},
      {"id":"z8utpmyzcajmhpd4rg2","xPct":26.876807953589182,"yPct":39.473959658401505,"imgId":"7HQrinn","imgExt":"png"},
      {"id":"p7t9wkkptqmhpd56eu","xPct":10.747192435369291,"yPct":10.147951378356296,"imgId":"bwD1OmL","imgExt":"png"},
      {"id":"agtpf2v2okpmhpd5sve","xPct":21.54370110498454,"yPct":9.672003200345415,"imgId":"oDgoZII","imgExt":"jpeg"},
      {"id":"9zg4kaufdyjmhpd6ot3","xPct":32.80837419639712,"yPct":43.606134290970296,"imgId":"ISr0e4s","imgExt":"jpeg"},
      {"id":"ct0ejgu1ctfmhpd7n2a","xPct":32.5829250594446,"yPct":46.48687326314141,"imgId":"DbV7szL","imgExt":"jpeg"},
      {"id":"79rs2qvt666mhpd87n0","xPct":32.683124675867944,"yPct":45.78547594817801,"imgId":"fenCNCb","imgExt":"jpeg"},
      {"id":"31oxmzj0srrmhpd8vbn","xPct":75.09890308818349,"yPct":20.703036322360955,"imgId":"DctgyNK","imgExt":"jpeg"},
      {"id":"5ggskxczowdmhpdc8he","xPct":52.86487288076862,"yPct":37.48768518069847,"imgId":"295Kn0P","imgExt":"jpeg"}
    ],
    [
      {"id":"5adbjzze72kmhpddcet","xPct":28.6601064834974,"yPct":46.548256536459355,"imgId":"SQ1LmBP","imgExt":"png"},
      {"id":"mmo6ffch4wmhpddten","xPct":26.906613196088884,"yPct":55.190473452972725,"imgId":"f8omEf5","imgExt":"jpeg"},
      {"id":"u6ie1rw5k6mhpdepef","xPct":45.604737159477864,"yPct":4.93914313071665,"imgId":"oiZV5px","imgExt":"jpeg"},
      {"id":"li9qk549ljmhpdfhvk","xPct":53.545556761027825,"yPct":4.788843706081635,"imgId":"fJuDCsI","imgExt":"jpeg"},
      {"id":"x9ji7hrblwmhpdfwck","xPct":52.73916053465889,"yPct":36.12933113820502,"imgId":"Y5shAtp","imgExt":"jpeg"},
      {"id":"0hpz74hml0wmhpdh8ii","xPct":86.450331960155,"yPct":48.126128346510626,"imgId":"bNXcfKw","imgExt":"jpeg"},
      {"id":"l38y404ryefmhpdhv0o","xPct":83.30699709381972,"yPct":55.83982310951505,"imgId":"DE4ExKk","imgExt":"jpeg"},
      {"id":"kgh9urked5smhpdk7eq","xPct":68.14959734236173,"yPct":39.56070626541156,"imgId":"M2kxezO","imgExt":"jpeg"},
      {"id":"48o8kvqjqrlmhpdkmcq","xPct":67.7738487807742,"yPct":35.90342026595953,"imgId":"OrBlbuM","imgExt":"jpeg"},
      {"id":"d6eheu3qu4mhpdljxc","xPct":37.02454184239109,"yPct":16.574931687639438,"imgId":"OO0OD2L","imgExt":"png"},
      {"id":"17i691443osmhpdmaei","xPct":18.665705788387022,"yPct":6.669520532237073,"imgId":"ql7Nzyo","imgExt":"jpeg"},
      {"id":"d5d6c7p9l0emhpdmynp","xPct":46.73973907980743,"yPct":5.2049975697740125,"imgId":"cJ053rD","imgExt":"jpeg"},
      {"id":"jv6brf5exlrmhpdnh6e","xPct":51.7497199009746,"yPct":8.286135774791822,"imgId":"4PvJtCW","imgExt":"jpeg"},
      {"id":"urgq7xmy8wkmhpdodmw","xPct":53.44937057223375,"yPct":36.747686430975776,"imgId":"oulz1cp","imgExt":"png"},
      {"id":"uye28u6trwcmhpdomck","xPct":51.682364647344315,"yPct":37.342967190496694,"imgId":"lycUyF9","imgExt":"png"},
      {"id":"i7m5fqptgsomhpdpe2i","xPct":52.20841263356687,"yPct":36.56642016321578,"imgId":"0JZvgXb","imgExt":"png"},
      {"id":"gtg71azoms7mhpdqajq","xPct":90.1466911620807,"yPct":43.84886945183764,"imgId":"jySLDl6","imgExt":"jpeg"},
      {"id":"2tzhg9y7vmomhpdr5o6","xPct":66.78697062507338,"yPct":45.26312184429919,"imgId":"0jgOWKB","imgExt":"jpeg"},
      {"id":"l5cfgztrt1mhpdrpv3","xPct":48.75182247837489,"yPct":48.53714920349133,"imgId":"PNUUN7W","imgExt":"png"},
      {"id":"81bj1y0k119mhpdsafa","xPct":35.97310101422757,"yPct":51.73085908450429,"imgId":"7R4RjH3","imgExt":"png"},
      {"id":"w21xru1t1cjmhpdt7bf","xPct":68.97689244197424,"yPct":40.583491220302164,"imgId":"ZCQskGu","imgExt":"jpeg"},
      {"id":"vbag71mzvvrmhpdtxc0","xPct":59.315585981838815,"yPct":51.69882505186113,"imgId":"ZmT1OWm","imgExt":"jpeg"},
      {"id":"lr7jrrail4mhpduevf","xPct":15.09684821323731,"yPct":67.17866587244119,"imgId":"syuJj5N","imgExt":"png"},
      {"id":"y92cr03wchmhpduycy","xPct":34.058188814263765,"yPct":63.089256795765,"imgId":"ZsWwlUX","imgExt":"jpeg"},
      {"id":"6yxoo37md2wmhpdvzch","xPct":51.73209292682688,"yPct":66.36888001976594,"imgId":"pzG3B5R","imgExt":"jpeg"},
      {"id":"cbtqgx2ucaqmhpdwpnh","xPct":91.00708442600494,"yPct":80.7385807663705,"imgId":"WCej8rc","imgExt":"jpeg"},
      {"id":"0vmmwoe7emdmhpdx8wy","xPct":79.95555415573995,"yPct":74.79562556264433,"imgId":"xpnCjYg","imgExt":"jpeg"},
      {"id":"dy84k23komhpdy1hc","xPct":55.67173923147677,"yPct":74.4917486985792,"imgId":"BMmEtcW","imgExt":"jpeg"},
      {"id":"z25a1cwa2bhmhpdym90","xPct":64.46425557262515,"yPct":75.84444352029433,"imgId":"JEwGJ4U","imgExt":"png"},
      {"id":"3qnhq584sg5mhpdz7g7","xPct":62.03441487435908,"yPct":64.04593868644565,"imgId":"Qg5645c","imgExt":"jpeg"},
      {"id":"v09cbg4af5mhpe07g1","xPct":65.20326443794278,"yPct":59.01010986242123,"imgId":"xHue9iw","imgExt":"jpeg"},
      {"id":"k1up7j9gp6mhpe16eo","xPct":88.5372134183334,"yPct":65.64091610728404,"imgId":"Q5RnneW","imgExt":"png"},
      {"id":"9011uva8kqgmhpe2in3","xPct":50.75186406512975,"yPct":63.041591035852676,"imgId":"KMZcgJL","imgExt":"png"},
      {"id":"vavhzwzwujnmhpe311e","xPct":32.222186717190496,"yPct":60.610065462444716,"imgId":"DHhafnp","imgExt":"png"},
      {"id":"fo6voldfyrcmhpe3pne","xPct":57.515858008141215,"yPct":70.63275470664215,"imgId":"0gW5T2j","imgExt":"jpeg"},
      {"id":"p99wpr4ns5mhpe4qip","xPct":81.57362445692591,"yPct":83.83382177384634,"imgId":"RfSbbWJ","imgExt":"png"},
      {"id":"7zzbxfq2p03mhpe5gc5","xPct":65.36633650045012,"yPct":71.91006741946848,"imgId":"8FoJWoc","imgExt":"jpeg"},
      {"id":"fzzp50dmhaqmhpe5s9u","xPct":81.09767627891502,"yPct":77.74669507612822,"imgId":"0yxRQWd","imgExt":"png"},
      {"id":"g996j2migjhmhpe7dsb","xPct":87.39469989040667,"yPct":74.49162638459431,"imgId":"GeOKSpo","imgExt":"png"},
      {"id":"d4bmvrr0mxmhpe87gs","xPct":64.25386022936321,"yPct":68.14414825433485,"imgId":"swKKLpa","imgExt":"png"},
      {"id":"6b2rxcy0osemhpe8o7d","xPct":58.141683627539244,"yPct":67.14215209010138,"imgId":"WlLhp5R","imgExt":"jpeg"},
      {"id":"uo9dgnxt3vbmhpe9bon","xPct":56.23789091549571,"yPct":66.54095439156131,"imgId":"jEaNxuv","imgExt":"png"},
      {"id":"pvb4kkzngaomhpea2ao","xPct":78.69512688852792,"yPct":63.57081918568242,"imgId":"Z6OVDTP","imgExt":"png"},
      {"id":"rbdpdfabwpmhpebwxc","xPct":83.25864331774238,"yPct":65.19242436103174,"imgId":"DeEBXon","imgExt":"jpeg"},
      {"id":"c82mp0eejdmhpechsk","xPct":85.18251387040588,"yPct":66.35808581059925,"imgId":"zPpLPZC","imgExt":"jpeg"},
      {"id":"6eg97a9lr2qmhped3o5","xPct":86.1866474715253,"yPct":62.243831705741904,"imgId":"g1yPCAL","imgExt":"jpeg"},
      {"id":"ugx0itidnzmhpeg6t1","xPct":88.64153807389722,"yPct":59.83904091158166,"imgId":"EL2bWQq","imgExt":"jpeg"},
      {"id":"3rjzj5w8nemmhpegsuk","xPct":85.53846591353869,"yPct":63.1077170339348,"imgId":"01Uspis","imgExt":"jpeg"},
      {"id":"ykoy1obakummhpeh6yx","xPct":90.9993450086109,"yPct":62.731968472347255,"imgId":"I7guP69","imgExt":"jpeg"},
      {"id":"ijcaygtvggkmhpeicsr","xPct":77.13530556479705,"yPct":25.7192138757877,"imgId":"vh71gMW","imgExt":"jpeg"},
      {"id":"5e6gwfdg0mtmhpek0q8","xPct":90.96692874476496,"yPct":24.366291244275708,"imgId":"KFxwGMB","imgExt":"jpeg"},
      {"id":"n3qcyuir8imhpelmw1","xPct":75.19764105248737,"yPct":13.392979238424205,"imgId":"EJUsw4H","imgExt":"jpeg"},
      {"id":"lhk6k184qvmhpem8mp","xPct":75.92927744236565,"yPct":10.842208996682846,"imgId":"rr8ZKEe","imgExt":"jpeg"},
      {"id":"jpheera8racmhpemz4j","xPct":62.168211084582566,"yPct":66.54859289991781,"imgId":"K3K79Ev","imgExt":"jpeg"},
      {"id":"zf01oxgl9tgmhpenhu3","xPct":60.10366721789503,"yPct":57.526847919683746,"imgId":"xtBQCGA","imgExt":"jpeg"},
      {"id":"s7h0w8393tfmhpeoc0z","xPct":70.95055701788719,"yPct":60.30977851383616,"imgId":"3c8kgnO","imgExt":"jpeg"},
      {"id":"0os3nz4zoicamhpep502","xPct":91.2012272985244,"yPct":65.32745288465301,"imgId":"TSwV5Gw","imgExt":"png"},
      {"id":"glwuj4h4qedmhpepl2v","xPct":84.7634019433246,"yPct":59.064976858194065,"imgId":"rRLwQyF","imgExt":"jpeg"},
      {"id":"87bdq8hnvmnmhpeq5n7","xPct":66.51762605679284,"yPct":67.02021116286352,"imgId":"f77EfW0","imgExt":"png"},
      {"id":"76mry7haf7jmhpeqkt5","xPct":74.72875344925437,"yPct":77.86197600688872,"imgId":"k86uupF","imgExt":"jpeg"},
      {"id":"zu5wv2nhagcmhperfal","xPct":73.12145289443815,"yPct":15.105570729284903,"imgId":"RpawXxS","imgExt":"jpeg"},
      {"id":"d92890p65rmhpesj97","xPct":72.0630699831696,"yPct":61.50803969822694,"imgId":"c1U4R6h","imgExt":"jpeg"},
      {"id":"w85b2p6g33qmhpeth1k","xPct":73.81956913675683,"yPct":70.38791880308428,"imgId":"cFwx93N","imgExt":"png"},
      {"id":"5j26b5lpsiqmhpeuye1","xPct":53.58419727777996,"yPct":46.188839949704494,"imgId":"q8F3bjb","imgExt":"jpeg"},
      {"id":"y7c0pw26yxmhpevk6s","xPct":19.908293560902578,"yPct":32.5903319356922,"imgId":"jgHlHwp","imgExt":"png"},
      {"id":"4ksk2obt48qmhpewkn7","xPct":20.144595006164625,"yPct":46.95065272858038,"imgId":"IkaDFpW","imgExt":"jpeg"},
      {"id":"4vp9ezqfglymhpewvxa","xPct":8.777433497886413,"yPct":38.528165241301025,"imgId":"n2f3zIR","imgExt":"png"},
      {"id":"1vwuhbzhk8smhpexoc5","xPct":68.64304572252745,"yPct":68.52084862682571,"imgId":"7w8308T","imgExt":"png"},
      {"id":"feml5zrt49imhpey7d9","xPct":25.43612847799816,"yPct":26.309172448041018,"imgId":"1Qu903f","imgExt":"jpeg"},
      {"id":"74b0wx2rwjmhpeyqx1","xPct":19.348584001575404,"yPct":34.40859353595053,"imgId":"Kuk9pCI","imgExt":"png"},
      {"id":"gaslroz6njsmhpezbzr","xPct":84.03258811499471,"yPct":21.969426396336452,"imgId":"DapgdJU","imgExt":"jpeg"},
      {"id":"ihhybvtovcmhpezy0b","xPct":12.061530355884772,"yPct":44.24865576930604,"imgId":"UTVvpEt","imgExt":"jpeg"},
      {"id":"mjg8l15a73mhpf0vuc","xPct":12.794953294404868,"yPct":39.81769100551881,"imgId":"fWTimaI","imgExt":"jpeg"},
      {"id":"f66pmskwplmhpf1gm9","xPct":69.6667066225684,"yPct":34.602317483071744,"imgId":"jh3KNLY","imgExt":"jpeg"},
      {"id":"94huvpjoocsmhpf20rr","xPct":52.54994385788093,"yPct":69.69157611354652,"imgId":"sdVV1hl","imgExt":"jpeg"},
      {"id":"1f70gijslkzmhpf4f9p","xPct":70.26392605874985,"yPct":68.11092166033895,"imgId":"m1WZJRI","imgExt":"png"},
      {"id":"8cv8h49kr0umhpf59bh","xPct":68.0595344974363,"yPct":62.57489285294924,"imgId":"vD8WOrY","imgExt":"jpeg"},
      {"id":"as1ipkz3wi7mhpf5ozn","xPct":26.20002479916044,"yPct":44.00759325218208,"imgId":"yllk3ah","imgExt":"png"},
      {"id":"t84k9miup1jmhpf6an2","xPct":83.56726290657168,"yPct":14.531684214646365,"imgId":"7EGAZDP","imgExt":"jpeg"},
      {"id":"mhr8nzy6sumhpf6yul","xPct":82.71992054483542,"yPct":67.15701323926572,"imgId":"H3pCepK","imgExt":"png"},
      {"id":"9er4zb3tbtvmhpf7g5w","xPct":32.70534377568593,"yPct":4.503945505144526,"imgId":"kizolhl","imgExt":"png"},
      {"id":"3d11gx1w4nqmhpf88el","xPct":12.9028869769854,"yPct":40.382310706876986,"imgId":"ef43Kg8","imgExt":"png"},
      {"id":"mr31gxgnhomhpf8qt7","xPct":10.44659358609926,"yPct":55.03737915378293,"imgId":"8uGA8sM","imgExt":"jpeg"}
    ]
  ];

  let __hiddenLoaded = false;
  function ensureHiddenMarkersLoaded() {
    if (__hiddenLoaded) return;
    const combined = [];
    for (let i = 0; i < HIDDEN_MARKERS_PARTS.length; i++) {
      const part = HIDDEN_MARKERS_PARTS[i];
      if (Array.isArray(part)) {
        for (let j = 0; j < part.length; j++) combined.push(part[j]);
      }
    }
    state.markersData = combined.map(m => {
      const builtUrl = m.imgId
        ? ('https://i.imgur.com/' + String(m.imgId) + (m.imgExt ? ('.' + String(m.imgExt)) : ''))
        : (m.imgUrl ? String(m.imgUrl).replace(/`/g, '').trim() : null);
      return {
        id: String(m.id || (Math.random().toString(36).slice(2) + Date.now().toString(36))),
        xPct: Number(m.xPct),
        yPct: Number(m.yPct),
        imgUrl: builtUrl,
      };
    }).filter(m => !Number.isNaN(m.xPct) && !Number.isNaN(m.yPct));
    content.innerHTML = '';
    state.markersData.forEach(m => content.appendChild(createMarkerElement(m)));
    __hiddenLoaded = true;
  }

  const map = document.getElementById('map');
  const content = document.getElementById('mapContent');
  const sidebar = document.querySelector('.sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const cityTabs = document.getElementById('cityTabs');
  if (!map || !content) return;

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartTx = 0;
  let dragStartTy = 0;

  // Tworzenie overlay hasła dynamicznie, aby nie występował w index.html
  function ensureRoleOverlay() {
    if (document.getElementById('roleOverlay')) return;
    const div = document.createElement('div');
    div.id = 'roleOverlay';
    div.className = 'role-overlay hidden';
    div.setAttribute('role', 'dialog');
    div.setAttribute('aria-label', 'Panel logowania');

    const row = document.createElement('div');
    row.className = 'overlay-row';
    const label = document.createElement('label');
    label.setAttribute('for', 'roleOverlayInput');
    label.textContent = 'Hasło edytora:';
    const input = document.createElement('input');
    input.id = 'roleOverlayInput';
    input.type = 'password';
    input.placeholder = '';
    row.appendChild(label);
    row.appendChild(input);

    const actions = document.createElement('div');
    actions.className = 'overlay-actions';
    const save = document.createElement('button');
    save.id = 'roleOverlaySave';
    save.className = 'btn primary';
    save.textContent = 'Włącz edycję';
    const cancel = document.createElement('button');
    cancel.id = 'roleOverlayCancel';
    cancel.className = 'btn danger';
    cancel.textContent = 'Anuluj';
    const msg = document.createElement('span');
    msg.id = 'roleOverlayMsg';
    msg.className = 'msg';
    msg.setAttribute('aria-live', 'polite');
    actions.appendChild(save);
    actions.appendChild(cancel);
    actions.appendChild(msg);

    div.appendChild(row);
    div.appendChild(actions);
    map.appendChild(div);
  }
  ensureRoleOverlay();

  const state = {
    scale: 1,
    tx: 0,
    ty: 0,
    minScale: 1,
    maxScale: 4,
    markersData: [],
    isEditor: false,
    discordUser: null,
  };

  function registerImageCacheSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  function prefetchMarkerImages() {
    if (!('serviceWorker' in navigator)) return;
    const urls = (state.markersData || []).map(m => m.imgUrl).filter(Boolean);
    if (!urls.length) return;
    navigator.serviceWorker.ready.then(reg => {
      (reg.active || navigator.serviceWorker.controller)?.postMessage({ type: 'prefetch', urls });
    }).catch(() => {});
  }

  let modalBackdrop = null;
  function ensureModalBackdrop() {
    if (!modalBackdrop) {
      modalBackdrop = document.createElement('div');
      modalBackdrop.id = 'modalBackdrop';
      modalBackdrop.className = 'modal-backdrop hidden';
      document.body.appendChild(modalBackdrop);
    }
  }
  function showBackdrop() { ensureModalBackdrop(); modalBackdrop.classList.remove('hidden'); }
  function hideBackdrop() { if (modalBackdrop) modalBackdrop.classList.add('hidden'); }
  function openInfoModal(html) {
    if (!infoModal || !infoModalContent) return;
    infoModalContent.innerHTML = html || '';
    infoModal.classList.remove('hidden');
    showBackdrop();
  }
  function closeInfoModal() {
    if (!infoModal) return;
    infoModal.classList.add('hidden');
    infoModalContent.innerHTML = '';
    hideBackdrop();
  }
  
 
  function applyTransform() {
    content.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`;
  }

  function clampTranslate() {
    const rect = map.getBoundingClientRect();
    const scaledW = rect.width * state.scale;
    const scaledH = rect.height * state.scale;
    const minX = rect.width - scaledW; // maksymalnie w lewo
    const minY = rect.height - scaledH; // maksymalnie w górę
    const maxX = 0, maxY = 0;
    state.tx = Math.min(Math.max(state.tx, minX), maxX);
    state.ty = Math.min(Math.max(state.ty, minY), maxY);
  }

  // Wyłącz akcje pod PPM (menu kontekstowe)
  map.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // Zoom kołem myszy z zachowaniem punktu pod kursorem
  map.addEventListener('wheel', (e) => {
    e.preventDefault();
    const containerRect = map.getBoundingClientRect();
    const px = e.clientX - containerRect.left;
    const py = e.clientY - containerRect.top;

    const oldScale = state.scale;
    const zoomFactor = Math.exp(-e.deltaY * 0.0015); // płynny zoom
    const newScale = Math.min(Math.max(oldScale * zoomFactor, state.minScale), state.maxScale);

    // Obrazowy punkt pod kursorem (wsp. bazowe przed skalowaniem)
    const ix = (px - state.tx) / oldScale;
    const iy = (py - state.ty) / oldScale;

    // Ustal przesunięcie tak, by punkt pod kursorem został na miejscu
    state.scale = newScale;
    state.tx = px - newScale * ix;
    state.ty = py - newScale * iy;

    clampTranslate();
    applyTransform();
  }, { passive: false });

  // Referencje do overlay (zamiast prompt())
  const overlay = document.getElementById('imgOverlay');
  const overlayInput = document.getElementById('imgOverlayInput');
  const overlaySave = document.getElementById('imgOverlaySave');
  const overlayClear = document.getElementById('imgOverlayClear');
  const overlayCancel = document.getElementById('imgOverlayCancel');
  const overlayMsg = document.getElementById('imgOverlayMsg');
  let overlayTargetId = null;
  const lightboxOverlay = document.getElementById('lightboxOverlay');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');

  // Overlay i kontrolki trybu edycji
  const roleOverlay = document.getElementById('roleOverlay');
  const roleInput = document.getElementById('roleOverlayInput');
  const roleSave = document.getElementById('roleOverlaySave');
  const roleCancel = document.getElementById('roleOverlayCancel');
  const roleMsg = document.getElementById('roleOverlayMsg');
  const editToggleBtn = document.getElementById('editToggleBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const importJsonBtn = document.getElementById('importJsonBtn');
  const importJsonInput = document.getElementById('importJsonInput');
  const authGate = document.getElementById('authGate');
  const authGateLoginBtn = document.getElementById('authGateLoginBtn');
  const authGateMsg = document.getElementById('authGateMsg');
  const actionsToggle = document.getElementById('actionsToggle');
  const actionsPanel = document.getElementById('actionsPanel');
  const profileAvatar = document.getElementById('profileAvatar');
  const profilePanel = document.getElementById('profilePanel');
  const profileUser = document.getElementById('profileUser');
  const profileAvatarImg = document.getElementById('profileAvatarImg');
  const profileAvatarName = document.getElementById('profileAvatarName');
  // Elementy Discord usunięte z UI — pozostawiamy referencje null, jeśli istnieją w kodzie
  const discordLoginBtn = document.getElementById('discordLoginBtn');
  const discordLogoutBtn = document.getElementById('discordLogoutBtn');
  const userIndicator = document.getElementById('userIndicator');
  const infoModal = document.getElementById('infoModal');
  const infoModalContent = document.getElementById('infoModalContent');
  const infoModalClose = document.getElementById('infoModalClose');
  infoModalClose?.addEventListener('click', closeInfoModal);

  function setEditorMode(on) {
    // Tryb edycji sterowany hasłem (opcjonalny) lub innym mechanizmem
    state.isEditor = !!on;
    if (state.isEditor) {
      localStorage.setItem(STORAGE_EDITOR_KEY, '1');
      if (editToggleBtn) editToggleBtn.textContent = 'Wyłącz edycję';
      if (exportJsonBtn) exportJsonBtn.disabled = false;
      ensureHiddenMarkersLoaded();
      prefetchMarkerImages();
    } else {
      localStorage.removeItem(STORAGE_EDITOR_KEY);
      if (editToggleBtn) editToggleBtn.textContent = 'Login';
      if (exportJsonBtn) exportJsonBtn.disabled = false;
    }
  }

  function setAuthorized(on) {
    if (on) {
      if (authGate) { authGate.classList.add('hidden'); authGate.style.display = 'none'; }
      ensureHiddenMarkersLoaded();
      prefetchMarkerImages();
    } else {
      if (authGate) { authGate.classList.remove('hidden'); authGate.style.display = 'flex'; }
    }
  }
  function setAuthGateMessage(msg) {
    if (authGateMsg) authGateMsg.textContent = msg || '';
  }

  // Wczytaj tryb edycji z pamięci przeglądarki
  try {
    if (localStorage.getItem(STORAGE_EDITOR_KEY) === '1') {
      // Włączamy edytor tylko jeśli aktualny użytkownik Discord jest uprawniony
      setEditorMode(true);
    }
  } catch (_) {}

  // Inicjalny stan przycisków import/eksport
  if (exportJsonBtn) exportJsonBtn.disabled = false;
  if (importJsonBtn) importJsonBtn.disabled = false;

  // ===== Discord OAuth2 - pomocnicze =====
  function buildDiscordAuthUrl() {
    // Walidacja konfiguracji zanim przekierujemy do Discord
    const badClientId = !DISCORD_CLIENT_ID || !/^\d{17,20}$/.test(DISCORD_CLIENT_ID);
    const badRedirect = !DISCORD_REDIRECT_URI || !/^https?:\/\//i.test(DISCORD_REDIRECT_URI);
    if (badClientId || badRedirect) {
      const msg = badClientId
        ? 'Brak/niepoprawny Discord Client ID (ustaw ?dcid= lub localStorage).'
        : 'Niepoprawny Redirect URI (ustaw ?redirect_uri= lub localStorage).';
      if (userIndicator) userIndicator.textContent = msg;
      throw new Error(msg);
    }
    const params = new URLSearchParams();
    params.set('client_id', DISCORD_CLIENT_ID);
    params.set('redirect_uri', DISCORD_REDIRECT_URI);
    params.set('response_type', 'token');
    params.set('scope', DISCORD_SCOPES.join(' '));
    // CSRF state
    const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
    try { localStorage.setItem(STORAGE_OAUTH_STATE, state); } catch (_) {}
    params.set('state', state);
    // params.set('prompt', 'consent'); // opcjonalnie
    return 'https://discord.com/oauth2/authorize?' + params.toString();
  }

  function getStoredToken() {
    try {
      const token = localStorage.getItem(STORAGE_TOKEN_KEY);
      const exp = Number(localStorage.getItem(STORAGE_TOKEN_EXP_KEY) || 0);
      if (token && exp && Date.now() < exp) return token;
    } catch (_) {}
    return null;
  }

  async function fetchDiscordUser(token) {
    const res = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) throw new Error('Discord user fetch failed');
    return await res.json();
  }

  function updateAuthUI() {
    const token = getStoredToken();
    const hasUser = !!state.discordUser;
    // Pokazuj tylko przycisk wylogowania, login obsługuje editToggleBtn
    if (discordLogoutBtn) discordLogoutBtn.classList.toggle('hidden', !token);
    const configured = !!DISCORD_CLIENT_ID && /^\d{17,20}$/.test(DISCORD_CLIENT_ID) && !!DISCORD_REDIRECT_URI;
    if (userIndicator) {
      if (hasUser) {
        userIndicator.textContent = `Zalogowany: ${state.discordUser.username}#${state.discordUser.discriminator || ''}`;
      } else if (!configured) {
        userIndicator.textContent = 'Skonfiguruj Discord OAuth (Client ID i Redirect URI).';
      } else {
        userIndicator.textContent = '';
      }
    }
    if (profileUser) {
      if (hasUser) {
        profileUser.textContent = `Zalogowany: ${state.discordUser.username}#${state.discordUser.discriminator || ''}`;
      } else {
        profileUser.textContent = '';
      }
    }
    if (profileAvatarImg) {
      if (hasUser) {
        const u = state.discordUser;
        let src = '';
        if (u && u.avatar) src = `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64`;
        else if (u && u.discriminator) src = `https://cdn.discordapp.com/embed/avatars/${Number(u.discriminator)%5}.png`;
        profileAvatarImg.src = src;
      } else {
        profileAvatarImg.src = '';
      }
    }
    if (profileAvatarName) {
      profileAvatarName.textContent = hasUser ? (state.discordUser.username || '') : 'Profil';
    }
    // Edycja nie jest powiązana z Discord — zarządzana osobno przez hasło
  }

  function clearDiscordAuth() {
    try {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_TOKEN_EXP_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
    } catch (_) {}
    state.discordUser = null;
    updateAuthUI();
  }

  async function handleDiscordRedirect() {
    if (!location.hash) return;
    const hash = new URLSearchParams(location.hash.slice(1));
    const accessToken = hash.get('access_token');
    const tokenType = hash.get('token_type');
    const expiresIn = Number(hash.get('expires_in') || 0);
    const stateParam = hash.get('state');
    if (!accessToken || tokenType !== 'Bearer') return;
    // sprawdź state
    try {
      const stored = localStorage.getItem(STORAGE_OAUTH_STATE);
      if (stored && stateParam !== stored) {
        console.warn('Discord state mismatch');
      }
      localStorage.removeItem(STORAGE_OAUTH_STATE);
    } catch (_) {}
    // zapisz token i expiry
    try {
      localStorage.setItem(STORAGE_TOKEN_KEY, accessToken);
      localStorage.setItem(STORAGE_TOKEN_EXP_KEY, String(Date.now() + expiresIn * 1000));
    } catch (_) {}
    // usuń token z URL
    try {
      history.replaceState(null, '', location.pathname + location.search);
    } catch (_) {}
    // pobierz użytkownika
    try {
      const user = await fetchDiscordUser(accessToken);
      state.discordUser = user;
      try { localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user)); } catch (_) {}
      updateAuthUI();
      // Po poprawnym zalogowaniu włącz tryb edycji (jak po haśle)
      setEditorMode(true);
    } catch (err) {
      console.error(err);
      clearDiscordAuth();
    }
  }

  function showOverlayForMarker(id, clientX, clientY) {
    if (!overlay) return;
    overlayTargetId = id;
    overlayInput.value = '';
    overlayMsg.textContent = '';
    overlay.classList.remove('hidden');
    

    // Pozycjonowanie overlay względem mapy i miejsca kliknięcia
    const mapRect = map.getBoundingClientRect();
    overlay.style.left = (clientX - mapRect.left + 12) + 'px';
    overlay.style.top = (clientY - mapRect.top + 12) + 'px';

    // Flip jeśli wychodzi poza mapę
    requestAnimationFrame(() => {
      const oRect = overlay.getBoundingClientRect();
      let left = oRect.left - mapRect.left;
      let top = oRect.top - mapRect.top;
      const margin = 8;
      if (oRect.right > mapRect.right - margin) {
        left = (clientX - mapRect.left) - (oRect.width + 12);
      }
      if (oRect.bottom > mapRect.bottom - margin) {
        top = Math.max(margin, (clientY - mapRect.top) - (oRect.height + 12));
      }
      if (oRect.left < mapRect.left + margin) {
        left = margin;
      }
      if (oRect.top < mapRect.top + margin) {
        top = margin;
      }
      overlay.style.left = left + 'px';
      overlay.style.top = top + 'px';
      overlayInput.focus();
    });
  }

  function openLightbox(src) {
    if (!lightboxOverlay || !lightboxImg) return;
    lightboxImg.src = src || '';
    lightboxOverlay.classList.remove('hidden');
  }
  function closeLightbox() {
    if (!lightboxOverlay) return;
    lightboxOverlay.classList.add('hidden');
    if (lightboxImg) lightboxImg.src = '';
  }
  lightboxOverlay?.addEventListener('click', () => { closeLightbox(); });
  lightboxClose?.addEventListener('click', (e) => { e.stopPropagation(); closeLightbox(); });

  // Animacja sukcesu: zielony check bez tła (używana w panelu logowania)
  function showSuccessCheck() {
    const container = document.createElement('div');
    container.className = 'success-check';
    container.innerHTML = `
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle class="circle" cx="60" cy="60" r="50" />
        <polyline class="tick" points="45,65 58,78 82,52" />
      </svg>
    `;
    const actions = roleOverlay?.querySelector('.overlay-actions');
    (actions || document.body).appendChild(container);
    setTimeout(() => { container.remove(); }, 1400);
  }

  overlaySave?.addEventListener('click', () => {
    const url = overlayInput.value.trim();
    if (!/^https:\/\/i\.imgur\.com\//i.test(url)) {
      overlayMsg.textContent = 'Podaj poprawny URL z https://i.imgur.com/...';
      return;
    }
    if (!overlayTargetId) return;
    // aktualizacja danych i DOM
    const idx = state.markersData.findIndex(m => m.id === overlayTargetId);
    if (idx !== -1) {
      state.markersData[idx].imgUrl = url;
      const markerEl = content.querySelector(`.marker[data-id="${overlayTargetId}"]`);
      const tooltipEl = markerEl?.querySelector('.tooltip');
      if (tooltipEl) {
        tooltipEl.innerHTML = '';
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Podgląd';
        tooltipEl.appendChild(img);
      }
      saveMarkers();
    }
    overlay.classList.add('hidden');
    hideBackdrop();
    overlayTargetId = null;
  });

  overlayClear?.addEventListener('click', () => {
    if (!overlayTargetId) return;
    const idx = state.markersData.findIndex(m => m.id === overlayTargetId);
    if (idx !== -1) {
      state.markersData[idx].imgUrl = null;
      const markerEl = content.querySelector(`.marker[data-id="${overlayTargetId}"]`);
      const tooltipEl = markerEl?.querySelector('.tooltip');
      if (tooltipEl) {
        tooltipEl.innerHTML = 'SSA';
      }
      saveMarkers();
    }
    overlay.classList.add('hidden');
    hideBackdrop();
    overlayTargetId = null;
  });

  overlayCancel?.addEventListener('click', () => {
    overlay.classList.add('hidden');
    hideBackdrop();
    overlayTargetId = null;
    overlayMsg.textContent = '';
  });

  overlay?.addEventListener('wheel', (e) => {
    // Blokujemy propagację by nie powiększać mapy podczas przewijania w overlay
    e.stopPropagation();
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) {
      overlay.classList.add('hidden');
      hideBackdrop();
      overlayTargetId = null;
      overlayMsg.textContent = '';
    }
  });

  // Dodawanie punktu tylko pod SHIFT+LPM (od razu pokazuje overlay do obrazka)
  map.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (overlay && !overlay.classList.contains('hidden')) return;
    if (e.target && e.target.classList && e.target.classList.contains('marker')) return;

    if (e.shiftKey && state.isEditor) {
      const mapRect = map.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const localX = e.clientX - contentRect.left;
      const localY = e.clientY - contentRect.top;
      const baseX = localX / state.scale;
      const baseY = localY / state.scale;
      const leftPct = (baseX / mapRect.width) * 100;
      const topPct = (baseY / mapRect.height) * 100;
      const result = addMarker(leftPct, topPct, null);
      if (result && result.data?.id) {
        showOverlayForMarker(result.data.id, e.clientX, e.clientY);
      }
      return;
    }

    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartTx = state.tx;
    dragStartTy = state.ty;
    map.style.cursor = 'grabbing';
    const onMove = (ev) => {
      if (!isDragging) return;
      const dx = ev.clientX - dragStartX;
      const dy = ev.clientY - dragStartY;
      state.tx = dragStartTx + dx;
      state.ty = dragStartTy + dy;
      clampTranslate();
      applyTransform();
    };
    const onUp = () => {
      isDragging = false;
      map.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  });

  // Obsługa role-overlay
  function openRoleOverlay() {
    if (!roleOverlay) return;
    roleMsg.textContent = '';
    roleMsg.classList.remove('error');
    roleInput.value = '';
    roleOverlay.classList.remove('hidden');
    showBackdrop();
    // Pozycjonowanie centralne zdefiniowane w CSS (reset inline, jeśli było)
    roleOverlay.style.left = '';
    roleOverlay.style.top = '';
    // Przywróć przyciski i usuń ewentualną poprzednią animację
    roleSave?.classList.remove('hidden');
    roleCancel?.classList.remove('hidden');
    const prevCheck = roleOverlay?.querySelector('.overlay-actions .success-check');
    prevCheck?.remove();
    roleInput.focus();
  }

  function showLoginPrompt() {
    const html = `
      <div class="gate-msg" style="text-align:center;margin-bottom:8px;">Zaloguj się przyciskiem \"Login\"</div>
      <div class="modal-actions">
        <button id="infoModalLoginBtn" class="btn primary">Login</button>
        <button id="infoModalCancelBtn" class="btn danger">Zamknij</button>
      </div>
    `;
    openInfoModal(html);
    const loginBtn = document.getElementById('infoModalLoginBtn');
    const cancelBtn = document.getElementById('infoModalCancelBtn');
    loginBtn?.addEventListener('click', () => {
      editToggleBtn?.click();
      closeInfoModal();
    });
    cancelBtn?.addEventListener('click', () => {
      closeInfoModal();
    });
  }

  roleSave?.addEventListener('click', () => {
    const code = roleInput.value.trim();
    if (code !== EDIT_CODE) {
      roleMsg.textContent = 'Niepoprawne hasło';
      roleMsg.classList.add('error');
      return;
    }
    roleMsg.textContent = '';
    roleMsg.classList.remove('error');
    // Usuń przyciski i pokaż samą animację
    roleSave?.classList.add('hidden');
    roleCancel?.classList.add('hidden');
    // Pokaż animację sukcesu (zielony check) bez tła
    showSuccessCheck();
    // Schowaj panel po zakończeniu animacji
    setTimeout(() => {
      setEditorMode(true);
      roleOverlay.classList.add('hidden');
      hideBackdrop();
    }, 1100);
  });

  roleCancel?.addEventListener('click', () => {
    roleOverlay.classList.add('hidden');
    hideBackdrop();
    roleMsg.textContent = '';
    roleMsg.classList.remove('error');
    const rowEl = roleOverlay?.querySelector('.overlay-row');
    rowEl?.classList.remove('hidden');
    roleCancel && (roleCancel.textContent = 'Anuluj');
    roleSave && (roleSave.textContent = 'Włącz edycję');
    const actions = roleOverlay?.querySelector('.overlay-actions');
    const loginBtn = actions?.querySelector('#roleLoginBtn');
    loginBtn?.remove();
  });

  roleOverlay?.addEventListener('wheel', (e) => {
    e.stopPropagation();
  }, { passive: true });

  // Obsługa przycisku edycji/logowania przeniesiona do auth.js

  // Wylogowanie Discord obsługiwane w auth.js

  function createMarkerElement(data) {
    const marker = document.createElement('div');
    marker.className = 'marker';
    marker.style.left = data.xPct + '%';
    marker.style.top = data.yPct + '%';
    marker.dataset.id = data.id;

  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip right above';
    let hideTimer = null;
    
    if (data.imgUrl) {
      const img = document.createElement('img');
      img.src = data.imgUrl;
      img.alt = 'Podgląd';
      tooltip.appendChild(img);
      img.addEventListener('click', () => {
        if (data.imgUrl) openLightbox(data.imgUrl);
      });
    } else {
      tooltip.textContent = 'DYNIA';
    }
    marker.appendChild(tooltip);

    // Zoom w tooltipie (scroll nad tooltipem)
    let tooltipZoom = 1;
    tooltip.dataset.zoom = '1';
    tooltip.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const step = 0.2;
      const direction = Math.sign(ev.deltaY); // 1 = w dół (oddal), -1 = w górę (zbliż)
      tooltipZoom = Math.max(1, Math.min(4, tooltipZoom - direction * step));

      // transform-origin w miejscu kursora
      const rect = tooltip.getBoundingClientRect();
      const originX = ((ev.clientX - rect.left) / rect.width) * 100;
      const originY = ((ev.clientY - rect.top) / rect.height) * 100;

      const imgEl = tooltip.querySelector('img');
      if (imgEl) {
        imgEl.style.transformOrigin = originX + '% ' + originY + '%';
        imgEl.style.transform = 'scale(' + tooltipZoom + ')';
      } else {
        tooltip.style.transformOrigin = originX + '% ' + originY + '%';
        tooltip.style.transform = 'scale(' + Math.min(tooltipZoom, 2) + ')';
      }

      tooltip.dataset.zoom = String(tooltipZoom);
      tooltip.style.cursor = tooltipZoom > 1 ? 'zoom-out' : 'zoom-in';
    }, { passive: false });

    // Reset zoom po wyjściu kursora z tooltipa
    tooltip.addEventListener('mouseleave', () => {
      tooltipZoom = 1;
      const imgEl = tooltip.querySelector('img');
      if (imgEl) {
        imgEl.style.transform = '';
        imgEl.style.transformOrigin = '';
      }
      tooltip.style.transform = '';
      tooltip.style.transformOrigin = '';
      tooltip.style.cursor = 'zoom-in';
      tooltip.dataset.zoom = '1';
    });

    // Ustalanie orientacji tooltipa, aby nie wychodził poza mapę
    const setOrientation = (h, v) => {
      tooltip.classList.remove('left', 'right', 'above', 'below');
      tooltip.classList.add(h, v);
    };

    const repositionTooltip = () => {
      // Domyślnie: right + above
      setOrientation('right', 'above');
      // Poczekaj na render, aby pomiary były poprawne
      requestAnimationFrame(() => {
        const mapRect = map.getBoundingClientRect();
        let tRect = tooltip.getBoundingClientRect();
        const margin = 4; // bezpieczny margines od krawędzi

        // Flip poziomy, jeśli wychodzi poza prawą krawędź
        if (tRect.right > mapRect.right - margin) {
          setOrientation('left', tooltip.classList.contains('below') ? 'below' : 'above');
          tRect = tooltip.getBoundingClientRect();
        }
        // Jeśli z jakiegoś powodu poza lewą, ustaw w prawo
        if (tRect.left < mapRect.left + margin) {
          setOrientation('right', tooltip.classList.contains('below') ? 'below' : 'above');
          tRect = tooltip.getBoundingClientRect();
        }

        // Flip pionowy, jeśli wychodzi ponad górę
        if (tRect.top < mapRect.top + margin) {
          setOrientation(tooltip.classList.contains('left') ? 'left' : 'right', 'below');
          tRect = tooltip.getBoundingClientRect();
        }
        // Albo poza dołem
        if (tRect.bottom > mapRect.bottom - margin) {
          setOrientation(tooltip.classList.contains('left') ? 'left' : 'right', 'above');
        }
      });
    };

    marker.addEventListener('mouseenter', () => {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      tooltip.style.display = 'block';
      repositionTooltip();
    });
    // Dla bezpieczeństwa, jeśli po zmianie zoomu mapy tooltip się pokaże w nowej pozycji
    marker.addEventListener('mousemove', (ev) => {
      // tylko gdy tooltip jest widoczny (hover)
      if (getComputedStyle(tooltip).display !== 'none') {
        repositionTooltip();
      }
    });

    marker.addEventListener('mouseleave', () => {
      setOrientation('right', 'above');
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { tooltip.style.display = 'none'; }, 200);
    });

    // Tooltip jest potomkiem markera — utrzymuje widoczność przy najechaniu
    tooltip.addEventListener('mouseenter', () => {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      tooltip.style.display = 'block';
      repositionTooltip();
    });
    tooltip.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });

    marker.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (!state.isEditor) return; // tylko w trybie edycji można usuwać
      const id = marker.dataset.id;
      marker.remove();
      // Usuń z danych i zapisz
      state.markersData = state.markersData.filter(m => m.id !== id);
      saveMarkers();
    });

    return marker;
  }

  function addMarker(leftPct, topPct, imgUrl = null) {
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const data = { id, xPct: leftPct, yPct: topPct, imgUrl };
    state.markersData.push(data);
    const el = createMarkerElement(data);
    content.appendChild(el);
    saveMarkers();
    return { data, markerEl: el };
  }

  async function saveMarkers() { return; }

  async function loadMarkers() {
    const arr = [];
    state.markersData = arr;
    content.innerHTML = '';
  }

  // ===== Import / Export JSON =====
  function downloadJsonFile(filename, data) {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Nie udało się wygenerować pliku JSON:', err);
    }
  }

  exportJsonBtn?.addEventListener('click', async () => {
    if (!state.isEditor) { showLoginPrompt(); return; }
    downloadJsonFile('markers.json', state.markersData);
  });

  importJsonBtn?.addEventListener('click', () => {
    if (!state.isEditor) { showLoginPrompt(); return; }
    importJsonInput?.click();
  });

  importJsonInput?.addEventListener('change', async (e) => {
    if (!state.isEditor) { showLoginPrompt(); return; }
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error('Plik JSON musi zawierać tablicę markerów');
      // Walidacja i normalizacja
      const normalized = arr.map(m => ({
        id: String(m.id || (Math.random().toString(36).slice(2) + Date.now().toString(36))),
        xPct: Number(m.xPct),
        yPct: Number(m.yPct),
        imgUrl: m.imgUrl ? String(m.imgUrl) : null,
      })).filter(m => !Number.isNaN(m.xPct) && !Number.isNaN(m.yPct));
      state.markersData = normalized;
      // render
      content.innerHTML = '';
      state.markersData.forEach(m => content.appendChild(createMarkerElement(m)));
      // zapisz do API tylko w trybie edycji; dla wszystkich pozostaje podgląd lokalny
      if (state.isEditor) {
        await saveMarkers();
      }
    } catch (err) {
      console.error('Import JSON nieudany:', err);
      alert('Nie udało się wczytać pliku JSON. Upewnij się, że ma poprawny format.');
    } finally {
      if (importJsonInput) importJsonInput.value = '';
    }
  });

  // Zakładki miast → ustaw przybliżenie i wycentruj wskazany obszar
  const cityTargets = {
    LS: { xPct: 72, yPct: 70, zoom: 2.1 },      // Los Santos
    SF: { xPct: 22, yPct: 40, zoom: 2.0 },      // San Fierro
    LV: { xPct: 75, yPct: 23, zoom: 2.2 },      // Las Venturas
  };

  function focusCity(key) {
    const t = cityTargets[key];
    if (!t) return;

    const rect = map.getBoundingClientRect();
    state.scale = Math.min(Math.max(t.zoom, state.minScale), state.maxScale);

    const ix = (t.xPct / 100) * rect.width;
    const iy = (t.yPct / 100) * rect.height;

    state.tx = rect.width / 2 - state.scale * ix;
    state.ty = rect.height / 2 - state.scale * iy;

    clampTranslate();
    applyTransform();
  }

  if (sidebar) {
    sidebar.addEventListener('click', (e) => {
      const btn = e.target.closest('button.tab');
      if (!btn) return;
      const city = btn.getAttribute('data-city');
      focusCity(city);
    });
  }

  if (sidebarToggle && sidebar && cityTabs) {
    const updateToggleText = () => {
      const collapsed = sidebar.classList.contains('collapsed');
      sidebarToggle.textContent = collapsed ? 'Miasta ▸' : 'Miasta ▾';
      sidebarToggle.setAttribute('aria-expanded', (!collapsed).toString());
    };

    const collapseTabs = () => {
      cityTabs.style.overflow = 'hidden';
      cityTabs.style.height = cityTabs.scrollHeight + 'px';
      void cityTabs.offsetHeight; // force reflow
      cityTabs.style.height = '0px';
      sidebar.classList.add('collapsed');
    };

    const expandTabs = () => {
      cityTabs.style.overflow = 'hidden';
      cityTabs.style.height = '0px';
      sidebar.classList.remove('collapsed');
      void cityTabs.offsetHeight; // force reflow
      cityTabs.style.height = cityTabs.scrollHeight + 'px';
    };

    cityTabs.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'height') {
        const isCollapsed = sidebar.classList.contains('collapsed');
        cityTabs.style.height = isCollapsed ? '0px' : 'auto';
        cityTabs.style.overflow = isCollapsed ? 'hidden' : 'visible';
      }
    });

    sidebarToggle.addEventListener('click', () => {
      const collapsed = sidebar.classList.contains('collapsed');
      if (collapsed) expandTabs(); else collapseTabs();
      updateToggleText();
    });
    // start collapsed
    sidebar.classList.add('collapsed');
    cityTabs.style.height = '0px';
    cityTabs.style.overflow = 'hidden';
    updateToggleText();
  }

  // Start — wczytaj markery i ustaw transformację
  loadMarkers();
  applyTransform();
  registerImageCacheSW();
  // Logowanie Discord i UI przeniesione do auth.js

  // Reakcja na zmianę rozmiaru okna – przeliczenie ograniczeń
  window.addEventListener('resize', () => {
    clampTranslate();
    applyTransform();
  });
  // Udostępnij wybrane funkcje globalnie dla auth.js (fallback do hasła i przełączanie edycji)
  window.openRoleOverlay = openRoleOverlay;
  window.setEditorMode = setEditorMode;
  window.setAuthorized = setAuthorized;
  window.setAuthGateMessage = setAuthGateMessage;
  // Akordeony po prawej stronie
  const accordionToggle = document.getElementById('accordionToggle');
  const accordionPanel = document.getElementById('accordionPanel');
  const accordionToggleThanks = document.getElementById('accordionToggleThanks');
  const accordionPanelThanks = document.getElementById('accordionPanelThanks');
  const accordionToggleResp = document.getElementById('accordionToggleResp');
  const accordionPanelResp = document.getElementById('accordionPanelResp');

  function getPanelHTML(p) {
    const c = p?.querySelector('.accordion-content');
    return c ? c.innerHTML : '';
  }
  function detachAndBindModal(t, p) {
    if (!t || !p) return;
    const clone = t.cloneNode(true);
    t.parentNode.replaceChild(clone, t);
    clone.addEventListener('click', () => openInfoModal(getPanelHTML(p)));
  }

  detachAndBindModal(accordionToggle, accordionPanel);
  detachAndBindModal(accordionToggleThanks, accordionPanelThanks);
  detachAndBindModal(accordionToggleResp, accordionPanelResp);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && infoModal && !infoModal.classList.contains('hidden')) closeInfoModal();
  });

  const thanksHtml = accordionPanelThanks?.querySelector('.accordion-content')?.innerHTML || document.getElementById('tplThanks')?.innerHTML || '';
  const respHtml = accordionPanelResp?.querySelector('.accordion-content')?.innerHTML || document.getElementById('tplResp')?.innerHTML || '';
  document.querySelector('.accordion-wrap')?.remove();
  if (actionsPanel) {
    const mkBtn = (id, text) => { const b = document.createElement('button'); b.id = id; b.className = 'btn'; b.textContent = text; return b; };
    const thanksBtn = document.getElementById('actionThanksBtn') || (actionsPanel.appendChild(mkBtn('actionThanksBtn', 'Podziękowania')));
    const respBtn = document.getElementById('actionRespBtn') || (actionsPanel.appendChild(mkBtn('actionRespBtn', 'Możliwe respy dyń')));
    thanksBtn?.addEventListener('click', () => openInfoModal(thanksHtml));
    respBtn?.addEventListener('click', () => openInfoModal(respHtml));
  }

  // Rozsuwany panel akcji (lewa strona, animacja w bok)
  function expandActions() {
    if (!actionsPanel || !actionsToggle) return;
    actionsPanel.hidden = false;
    actionsPanel.style.width = '0px';
    void actionsPanel.offsetWidth;
    actionsPanel.style.width = actionsPanel.scrollWidth + 'px';
    actionsToggle.setAttribute('aria-expanded', 'true');
  }
  function collapseActions() {
    if (!actionsPanel || !actionsToggle) return;
    actionsPanel.style.width = actionsPanel.scrollWidth + 'px';
    void actionsPanel.offsetWidth;
    actionsPanel.style.width = '0px';
    actionsToggle.setAttribute('aria-expanded', 'false');
  }
  actionsPanel?.addEventListener('transitionend', (e) => {
    if (e.propertyName === 'width') {
      const expanded = actionsToggle?.getAttribute('aria-expanded') === 'true';
      actionsPanel.style.width = expanded ? 'auto' : '0px';
      if (!expanded) actionsPanel.hidden = true;
    }
  });
  actionsToggle?.addEventListener('click', () => {
    const expanded = actionsToggle.getAttribute('aria-expanded') === 'true';
    if (expanded) collapseActions(); else expandActions();
  });
  authGateLoginBtn?.addEventListener('click', () => {
    if (window.beginDiscordOAuth) window.beginDiscordOAuth();
  });
  setAuthorized(false);
})();
  // Rozwijanie sekcji Profil
  function expandProfile() {
    if (!profilePanel || !profileAvatar) return;
    profilePanel.hidden = false;
    profilePanel.style.height = '0px';
    void profilePanel.offsetHeight;
    profilePanel.style.height = profilePanel.scrollHeight + 'px';
    profileAvatar.setAttribute('aria-expanded', 'true');
  }
  function collapseProfile() {
    if (!profilePanel || !profileAvatar) return;
    profilePanel.style.height = profilePanel.scrollHeight + 'px';
    void profilePanel.offsetHeight;
    profilePanel.style.height = '0px';
    profileAvatar.setAttribute('aria-expanded', 'false');
  }
  profilePanel?.addEventListener('transitionend', (e) => {
    if (e.propertyName === 'height') {
      const expanded = profileAvatar?.getAttribute('aria-expanded') === 'true';
      profilePanel.style.height = expanded ? 'auto' : '0px';
      if (!expanded) profilePanel.hidden = true;
    }
  });
  profileAvatar?.addEventListener('click', () => {
    const expanded = profileAvatar.getAttribute('aria-expanded') === 'true';
    if (expanded) collapseProfile(); else expandProfile();
  });
