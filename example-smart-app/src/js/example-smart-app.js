var globalSMART = null;
var globalObvs = null;

Date.isGreater = function(date1, date2) {
    var date1_ms = date1 === undefined ? new Date() : date1.getTime();
    var date2_ms = date2 === undefined ? new Date() : date2.getTime();

    if (date1_ms > date2_ms) {
        return true;
    }

    return false;
};

var sortResults = function (list, date) {
    for(var i = 0; i<list.length; i++) {
        for(var j = list.length-1; j>i; j--) {
            if( Date.isGreater( list[i][date], list[j][date] ) ) {
                var tmp = list[j][date];
                list[j][date] = list[i][date];
                list[i][date] = tmp;
            }
        }
    }
    return list;
};

var getFormattedObservations = function(results) {
    var list = [];
    var observations = [];
    console.log("Observations:")
    results.forEach(function (obs) {
        obs = obs.resource;
        // console.log(obs);
        var item = {};
        if(obs.component !== undefined) {
            var date = new Date(obs.issued);
            obs.component.forEach(function (elem) {
                item = {};
                item.observation = elem.code.text!=undefined?elem.code.text:elem.code.coding[0].display;
                try {
                    item.value = Number(elem.valueQuantity.value).toFixed(2) + ' ' + elem.valueQuantity.unit;
                } catch(e) {
                    if(elem.valueCodeableConcept!=undefined)
                        item.value = elem.valueCodeableConcept.text;
                    else
                        item.value = "N/A";
                }
                item.date = date;
                list.push(item);
            });
        } else {
            item = {};
            // console.log(obs);
            item.observation = obs.code.text!=undefined?obs.code.text:obs.code.coding[0].display;//obs.code.coding[0].display;
            try {
                item.value = Number(obs.valueQuantity.value).toFixed(2) + ' ' + obs.valueQuantity.unit;
            } catch(e) {
                if(obs.valueCodeableConcept!=undefined)
                    item.value = obs.valueCodeableConcept.text;
                else
                    item.value = "N/A";
    }
            item.date = new Date(obs.effectiveDateTime==undefined?obs.issued:obs.effectiveDateTime);
            list.push(item)
        }
    });

    list.forEach(function (value) {
        // observations = MedInReal.filterResults(observations, 'observation', 'date', value);
        observations.push(value);
    });

    return sortResults(observations, 'date');
};

(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart)  {
      if (smart.hasOwnProperty('patient')) {
        globalSMART = smart;
        console.log("smart: ");
        console.log(smart);
        var patient = smart.patient;
        //var patient = smart.api.search({
         //           type: 'Patient'
       // });
        console.log(patient);
        var pt = patient.read();
        //var obv = smart.patient.api.fetchAll({
        //var obv = smart.api.search({
//                     type: 'Observation',
//                     query: {
//                       code: {
//                         $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
//                               'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
//                               'http://loinc.org|2089-1', 'http://loinc.org|55284-4']
//                       }
//                     }
//                   });
        var obv = patient.request('Observation',{
          query: {
            code: {
              $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
                    'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
                    'http://loinc.org|2089-1', 'http://loinc.org|55284-4']
            }
          }
        });
          
        var alrg = patient.request('AllergyIntolerance');
        var crpn = patient.request('CarePlan');
        var cond = patient.request('Condition');
        var diag = patient.request('DiagnosticReport');
        var enct = patient.request('Encounter');
        var immn = patient.request('Immunization');
        var medo = patient.request('MedicationOrder');
        var proc = patient.request('Procedure');

        $.when(pt, obv, alrg, crpn, cond, diag, enct, immn, medo, proc).fail(onError);

        $.when(pt, obv, alrg, crpn, cond, diag, enct, immn, medo, proc).done(function(patient, obv, allergy, careplan, condition, diagnostic, encounter, immunization, medication, procedure) {
            console.log('Patient: ');
            console.log(patient);
            console.log('Observations: ');
            console.log(obv);
            console.log('AllergyIntolerance: ');
            console.log(allergy);
            console.log('CarePlan: ');
            console.log(careplan);
            console.log('Condition: ');
            console.log(condition);
            console.log('DiagnosticReport: ');
            console.log(diagnostic);
            console.log('Encounter: ');
            console.log(encounter);
            console.log('Immunization: ');
            console.log(immunization);
            console.log('MedicationOrder: ');
            console.log(medication);
            console.log('Procedure: ');
            console.log(procedure);
            globalObvs = obv;
          
            var byCodes = smart.byCodes(obv, 'code');
            var gender = patient.gender;

            var fname = '';
            var lname = '';

            if (typeof patient.name[0] !== 'undefined') {
                fname = patient.name[0].given.join(' ');
                lname = patient.name[0].family.join(' ');
            }

            var height = byCodes('8302-2');
            var systolicbp = getBloodPressureValue(byCodes('55284-4'),'8480-6');
            var diastolicbp = getBloodPressureValue(byCodes('55284-4'),'8462-4');
            var hdl = byCodes('2085-9');
            var ldl = byCodes('2089-1');

            var p = defaultPatient();
            p.birthdate = patient.birthDate;
            p.gender = gender;
            p.fname = fname;
            p.lname = lname;
            p.height = getQuantityValueAndUnit(height[0]);

            if (typeof systolicbp != 'undefined')  {
                p.systolicbp = systolicbp;
            }

            if (typeof diastolicbp != 'undefined') {
                p.diastolicbp = diastolicbp;
            }

            p.hdl = getQuantityValueAndUnit(hdl[0]);
            p.ldl = getQuantityValueAndUnit(ldl[0]);

            ret.resolve(p);
        });
      } else {
        onError();
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function defaultPatient(){
    return {
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: ''},
      height: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
  };

})(window);
