function App()
{
    this.mount = document.getElementById("app");
    this.current_adapter = 0;
    this.adapters = {};
    this.error_message = null;
    this.error_timeout = null;

    //Retrieve metadata for each adapter
    var meta = {};
    var promises = adapters.map(
        function(adapter, i)
        {
            return apiGET(i, "", true).then(
                function(data)
                {
                    meta[adapter] = data;
	        }
            );
        }
    );

    //Then generate the page and start the update loop
    $.when.apply($, promises)
    .then(
        (function()
        {
            this.generate(meta);
            setTimeout(this.update.bind(this), this.update_delay * 1000);
        }).bind(this)
    );
}

App.prototype.freq_overlay = null;
App.prototype.query_overlay = null;
App.prototype.update_delay = 0.2;
App.prototype.dark_mode = false;

//Submit GET request then update the current adapter with new data
App.prototype.update =
    function()
    {
        var updating_adapter = this.current_adapter;
        apiGET(updating_adapter, "", false)
        .done(
            (function(data)
            {
                this.adapters[adapters[updating_adapter]].update(data);
                setTimeout(this.update.bind(this), this.update_delay * 1000);
            }).bind(this)
        )
        .fail(this.setError.bind(this));
    };


//Construct page and call components to be constructed
App.prototype.generate =
    function(meta)
    {
        //Construct navbar
        var navbar = document.createElement("nav");
        navbar.classList.add("navbar");
        navbar.classList.add("navbar-inverse");
        navbar.classList.add("navbar-fixed-top");
        navbar.innerHTML = `
<div class="container-fluid">
    <div class="navbar-header">
        <div class="navbar-brand">
            Odin Server
        </div>
    </div>
    <img class="logo" src="img/stfc_logo.png">
    <ul class="nav navbar-nav" id="adapter-links"></ul>

    <ul class="nav navbar-nav navbar-right">
        <li class="dropdown">
            <a class="dropdown-toggle" href=# data-toggle="dropdown">
                Options
                <span class="caret"></span>
            </a>
            <ul class="dropdown-menu">
                <li><a href="#" id="update-freq">Update Frequency</a></li>
                <li><a href="#" id="toggle-dark">Toggle Dark</a></li>
                <li><a href="#" id="raw-query">Raw Query</a></li>
            </ul>
        </li>
    </ul>
</div>`;
        this.mount.appendChild(navbar);
        document.getElementById("update-freq").addEventListener("click", this.updateFrequency.bind(this));
        document.getElementById("toggle-dark").addEventListener("click", this.toggleDark.bind(this));
        this.documentBody = document.getElementsByTagName("body")[0];
        document.getElementById("raw-query").addEventListener("click", this.rawQuery.bind(this));
        var nav_list = document.getElementById("adapter-links");

        //Create error bar
        var error_bar = document.createElement("div");
        error_bar.classList.add("error-bar");
        this.mount.appendChild(error_bar);
        this.error_message = document.createTextNode("");
        error_bar.appendChild(this.error_message);

        //Add adapter pages
        for(var key in meta)
        {
            //Create DOM node for adapter
            var container = document.createElement("div");
            container.id = "adapter-" + key;
            container.classList.add("adapter-page");
            this.mount.appendChild(container);

            var adapter_name = Component.utils.getName(meta, key);
            this.adapters[key] = new Adapter(this, container, adapter_name, meta[key]);

            //Update navbar
            var list_elem = document.createElement("li");
            nav_list.appendChild(list_elem);
            var link = document.createElement("a");
            link.href = "#";
            list_elem.appendChild(link);
            var link_text = document.createTextNode(adapter_name);
            link.appendChild(link_text);
            
            link.addEventListener("click", this.changeAdapter.bind(this, [adapters.indexOf(key)]));
        }

        document.getElementById("adapter-" + adapters[this.current_adapter]).classList.add("active");


       //Add Testing Page
       //Create DOM node for adapter
       var container = document.createElement("div");
       container.id = "testing_page";
       container.classList.add("adapter-page");
       container.innerHTML = `
<div id="test-container" class="flex-container">
    <div class ="child-column">
        <h3>Backplane Tests</h3>
        <h5>I2C component tests for the backplane on QEM.</h5>
        <div class="flex-container">
            <h5>Serial Number:</h5>
            <div class="input-group" title="Serial Number for the QEM Backplane">
               <input id="serial-number" class="form-control" placeholder="SN:01" value="SN:01" type="text">
            </div>
        </div>
        <div class="input-group" title="Start generating a report which will include all tests added to it til Stop Generating Report is pressed">
            <button id="test-report-button" class="btn btn-default" type="button">Start Generating Report</button>
        </div>
        <div class="child">
            <div class="child-header">
                <div id="test-clock-collapse" class="collapse-button">
                    <div class="collapse-table">
                        <span id="test-clock-button-symbol" class="collapse-cell glyphicon glyphicon-triangle-bottom"></span>
                    </div>
                </div>
                <h4>Clock</h4>
            </div>
            <div id="test-clock-container" class="flex-container">
                <h5>Test cases:</h5>
                <div class="input-group" title="Clock frequency for the SI570 oscillator">
                   <input id="test-clock-input" class="form-control text-right" aria-label="Test Cases" placeholder="10,50,100,20" type="text">
                </div>
                <div class="input-group-btn">
                    <button id="test-clock-button" class="btn btn-default" type="button">Run Clock Test</button>
                </div>
            </div>
        </div>
        <div class="child">
            <div class="child-header">
                <div id="test-volt-collapse" class="collapse-button">
                    <div class="collapse-table">
                        <span id="test-volt-button-symbol" class="collapse-cell glyphicon glyphicon-triangle-bottom"></span>
                    </div>
                </div>
                <h4>Current Voltage</h4>
            </div>
            <div id="test-volt-container" class="flex-container">
                <div class="checkboxes">
                    <div>
                        <input type="checkbox" id="volt-check-0" name="supply" value="VDDO">
                        <label for="volt-check-0">VDDO</label>
                        <input type="checkbox" id="volt-check-1" name="supply" value="VDD_D18">
                        <label for="volt-check-1">VDD D18</label>
                        <input type="checkbox" id="volt-check-2" name="supply" value="VDD_D25">
                        <label for="volt-check-2">VDD D25</label>
                    </div>
                    <div>
                        <input type="checkbox" id="volt-check-3" name="supply" value="VDD_P18">
                        <label for="volt-check-3">VDD P18</label>
                        <input type="checkbox" id="volt-check-4" name="supply" value="VDD_A18_PLL">
                        <label for="volt-check-4">VDD_A18_PLL</label>
                        <input type="checkbox" id="volt-check-5" name="supply" value="VDD_D18ADC">
                        <label for="volt-check-5">VDD D18ADC</label>
                    </div>
                    <div>
                        <input type="checkbox" id="volt-check-6" name="supply" value="VDD_D18_PLL">
                        <label for="volt-check-6">VDD_D18_PLL</label>
                        <input type="checkbox" id="volt-check-7" name="supply" value="VDD_RST">
                        <label for="volt-check-7">VDD RST</label>
                        <input type="checkbox" id="volt-check-8" name="supply" value="VDD_A33">
                        <label for="volt-check-8">VDD A33</label>
                    </div>
                    <div>
                        <input type="checkbox" id="volt-check-9" name="supply" value="VDD_D33">
                        <label for="volt-check-9">VDD D33</label>
                        <input type="checkbox" id="volt-check-10" name="supply" value="VCTRL_NEG">
                        <label for="volt-check-10">VCTRL NEG</label>
                        <input type="checkbox" id="volt-check-11" name="supply" value="VRESET">
                        <label for="volt-check-11">VRESET</label>
                    </div>
                    <div>
                        <input type="checkbox" id="volt-check-12" name="supply" value="VCTRL_POS">
                        <label for="volt-check-12">VCTRL POS</label>
                    </div>
                    <div>
                        <input type="checkbox" id="volt-check-all" name="supply" value="Check_All">
                        <label for="volt-check-all">Check All?</label>
                    </div>
                    <div class="input-group-btn">
                        <button id="test-volt-button" class="btn btn-default" type="button">Run Voltage Test</button>
                        <button id="test-current-button" class="btn btn-default" type="button">Run Current Test</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="child">
            <div class="child-header">
                <div id="test-resist-collapse" class="collapse-button">
                    <div class="collapse-table">
                        <span id="test-resist-button-symbol" class="collapse-cell glyphicon glyphicon-triangle-bottom"></span>
                    </div>
                </div>
                <h4>Resistors</h4>
            </div>
            <div id="test-resist-container" class="flex-container">
                <div class="radios">
                    <div>
                        <input type="radio" id="resist-check-0" name="resistor" value="AUXRESET" checked>
                        <label for="resist-check-0">AUXRESET</label>
                        <input type="radio" id="resist-check-1" name="resistor" value="VCM">
                        <label for="resist-check-1">VCM</label>
                    </div>
                    <div>
                        <input type="radio" id="resist-check-2" name="resistor" value="DACEXTREF">
                        <label for="resist-check-2">DACEXTREF</label>
                        <input type="radio" id="resist-check-3" name="resistor" value="VDD_RST">
                        <label for="resist-check-3">VDD RST</label>
                    </div>
                    <div>
                        <input type="radio" id="resist-check-4" name="resistor" value="VRESET">
                        <label for="resist-check-4">VRESET</label>
                        <input type="radio" id="resist-check-5" name="resistor" value="VCTRL">
                        <label for="resist-check-5">VCTRL</label>
                    </div>
                    <div>
                        <input type="radio" id="resist-check-6" name="resistor" value="AUXSAMPLE">
                        <label for="resist-check-6">AUXSAMPLE</label>
                    </div>
                    <div>
                        <input type="checkbox" id="resist-check-range" name="resistor_range" value="Test_Range" checked>
                        <label for="resist-check-range">Test Range?</label>
                    </div>
                    <div id="test-resist-cases-container" class="flex-container">
                        <h5>Test cases:</h5>
                        <div class="input-group">
                            <input id="test-resist-input-cases" class="form-control text-right" aria-label="Test Cases" placeholder="" type="text">
                        </div>
                    </div>
                    <div id="test-resist-range-container" class="flex-container">
                        <h5>Min:</h5>
                        <div class="input-group" title="Resistance Register Values">
                            <input type="number" id="test-resist-input-min" min=0 max=255 class="form-control text-right" aria-label="Minimun" placeholder="0" type="text">
                        </div>
                        <h5>Max:</h5>
                        <div class="input-group" title="Resistance Register Values">
                            <input type="number" id="test-resist-input-max" min=0 max=255 class="form-control text-right" aria-label="Maximum" placeholder="255" type="text">
                        </div>
                        <h5>Step:</h5>
                        <div class="input-group" title="Resistance Register Values">
                            <input type="number" id="test-resist-input-step" min=0 max=255 class="form-control text-right" aria-label="Step" placeholder="17" type="text">
                        </div>
                    </div>
                    <div class="input-group-btn">
                        <button id="test-resist-button-0" class="btn btn-default" type="button">Run Manual Resistor Test</button>
                        <button id="test-resist-button-1" class="btn btn-default" type="button">Run Automatic Resistor Test</button>
                    </div>
                    <div>
                         <canvas id="myChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
`;

       this.mount.appendChild(container);
       document.getElementById("test-resist-cases-container").style.display='none';

       document.getElementById("test-report-button").addEventListener("click", this.testReport.bind(this));
       document.getElementById("test-clock-button").addEventListener("click", this.testClock.bind(this));
       document.getElementById("test-volt-button").addEventListener("click", this.testVolt.bind(this));
       document.getElementById("test-current-button").addEventListener("click", this.testCurrent.bind(this));
       document.getElementById("test-resist-button-0").addEventListener("click", this.testResist.bind(this,0));
       document.getElementById("test-resist-button-1").addEventListener("click", this.testResist.bind(this,1));
       document.getElementById("test-clock-collapse").addEventListener("click", this.toggleCollapsedClock.bind(this));
       document.getElementById("test-volt-collapse").addEventListener("click", this.toggleCollapsedVolt.bind(this));
       document.getElementById("test-resist-collapse").addEventListener("click", this.toggleCollapsedResist.bind(this));
       document.getElementById("volt-check-all").addEventListener("click", function() {
           $('#test-volt-container input[type="checkbox"]' ).prop('checked', this.checked);
       });
       document.getElementById("resist-check-range").addEventListener("click", function() {
           if(this.checked) {
               document.getElementById("test-resist-cases-container").style.display='none';
               document.getElementById("test-resist-range-container").style.display='flex';
           } else {
               document.getElementById("test-resist-cases-container").style.display='flex';
               document.getElementById("test-resist-range-container").style.display='none';
           }
       });      

       //Update navbar
       var list_elem = document.createElement("li");
       nav_list.appendChild(list_elem);
       var link = document.createElement("a");
       link.href = "#";
       list_elem.appendChild(link);
       var link_text = document.createTextNode("Testing");
       link.appendChild(link_text);
       link.addEventListener("click", this.changePage.bind(this));


        //Add overlays
        //Change frequency
        this.freq_overlay = document.createElement("div");
        this.freq_overlay.classList.add("overlay-background");
        this.freq_overlay.classList.add("hidden");
        this.freq_overlay.innerHTML = `
<div class="overlay-freq">
    <h5>Set the frequency to update the webpage:</h5>
    <div>
        <div class="input-group">
            <input class="form-control text-right" id="frequency-value" placeholder="5" type="text">
            <span class="input-group-addon">Hz</span>
        </div>
        <div class="overlay-control-buttons">
            <button class="btn btn-success" id="frequency-set" type="button">Set</button>
            <button class="btn btn-danger" id="frequency-cancel" type="button">Cancel</button>
        </div>
    <div>
</div>
`;
        this.mount.appendChild(this.freq_overlay);
        document.getElementById("frequency-cancel").addEventListener("click", this.frequencyCancel.bind(this));
        document.getElementById("frequency-set").addEventListener("click", this.frequencySet.bind(this));

        //Raw query
        this.query_overlay = document.createElement("div");
        this.query_overlay.classList.add("overlay-background");
        this.query_overlay.classList.add("hidden");
        this.query_overlay.innerHTML = `
<div class="overlay-query">
    <h5>Raw query:</h5>
    <div class="overlay-query-padding">
        <label>Body:</label>
        <textarea class="form-control noresize" rows="5" id="query-body"></textarea>
        <label>URL:</label>
        <div class="input-group">
            <input class="form-control text-right" id="query-url" placeholder="/" type="text">
        </div>
        <label>Metadata: <input id="query-meta" type="checkbox"></label>
        <div class="overlay-control-buttons">
            <button class="btn btn-primary" id="query-put" type="button">PUT</button>
            <button class="btn btn-primary" id="query-get" type="button">GET</button>
            <button class="btn btn-danger" id="query-cancel" type="button">Cancel</button>
        </div>
    <div>
</div></div> 
</div>
`;
        this.mount.appendChild(this.query_overlay);
        document.getElementById("query-cancel").addEventListener("click", this.queryCancel.bind(this));
        document.getElementById("query-put").addEventListener("click", this.queryPut.bind(this));
        document.getElementById("query-get").addEventListener("click", this.queryGet.bind(this));

        //Add footer
        var footer = document.createElement("div");
        footer.classList.add("footer");
        footer.innerHTML = `
<p>
    Odin server: <a href="www.github.com/odin-detector/odin-control">www.github.com/odin-detector/odin-control</a>
</p>
<p>
    API Version: ${api_version}
</p>`;
        this.mount.appendChild(footer);
        
        if(this.getCookie("dark") === "true")
            this.toggleDark();
    };

//Handles onClick events from the navbar
App.prototype.changeAdapter =
    function(adapter)
    {
        document.getElementById("testing_page").classList.remove("active");
        document.getElementById("adapter-" + adapters[this.current_adapter]).classList.remove("active");
        document.getElementById("adapter-" + adapters[adapter]).classList.add("active");

        this.current_adapter = adapter;
    };


App.prototype.changePage =
    function()
    {
        document.getElementById("adapter-" + adapters[this.current_adapter]).classList.remove("active");
        document.getElementById("testing_page").classList.add("active");
        this.current_adapter = adapters.indexOf("qem");
    };

App.prototype.toggleCollapsedClock =
    function()
    {
        document.getElementById("test-clock-container").classList.toggle("collapsed");
        document.getElementById("test-clock-button-symbol").classList.toggle("glyphicon-triangle-right");
        document.getElementById("test-clock-button-symbol").classList.toggle("glyphicon-triangle-bottom");
    };

App.prototype.toggleCollapsedVolt =
    function()
    {
        document.getElementById("test-volt-container").classList.toggle("collapsed");
        document.getElementById("test-volt-button-symbol").classList.toggle("glyphicon-triangle-right");
        document.getElementById("test-volt-button-symbol").classList.toggle("glyphicon-triangle-bottom");
    };

App.prototype.toggleCollapsedResist =
    function()
    {
        document.getElementById("test-resist-container").classList.toggle("collapsed");
        document.getElementById("test-resist-button-symbol").classList.toggle("glyphicon-triangle-right");
        document.getElementById("test-resist-button-symbol").classList.toggle("glyphicon-triangle-bottom");
    };

function getSerialNumber () {
    var SerialNumber = document.getElementById('serial-number').value;
    if(SerialNumber.length==0){
        SerialNumber = "SN:01";
    }
    return SerialNumber;
}

function getDate () {
    var today = new Date();
    var date = today.getDate()+'/'+(today.getMonth()+1)+'/'+today.getFullYear();
    return date;
}

function getMeasure (type,failed,testCase,resistor = "") {
     if(type==0){
         if(failed==1){
             measured = prompt("Please input the measured clock frequency",testCase);
         } else {
             measured = prompt(`Failed: ${failed} is not a number  - Please input the measured clock frequency`,testCase);
         }
     } else if(type==1) {
         if(failed==1){
             measured = prompt("Please input the measured voltage between " + resistLocation[resistor]  + " in " + resistUnits[resistor] ,testCase);;
         } else {
             measured = prompt(`Failed: ${failed} is not a number  - Please input the measured voltage between ${resistLocation[resistor]} in ${resistUnits[resistor]}`,testCase);
         }
     }
     if(measured==null){
         return;
     } else if(isNaN(measured) || measured.length==0) {
         return getMeasure(type,measured,testCase,resistor);
     } else {
         return measured;
     }
}

var report_window_html = "";
var clock_tests_html = "";
var volt_tests_html = "";
var current_tests_html = "";
var resistor_tests_html = [];
var reporting = false;

App.prototype.testReport =
    function() { 
        if (!reporting) {
            reporting = true;
            $('#test-report-button').text("Stop Generating Report");
            this.report_window_html = "<html><head><style>table, th, td {border: 1px solid black;border-collapse: collapse;padding: 5px;} td {text-align: right;}</style></head>";
            this.report_window_html += `<body><h5>Backplane Serial Number: ${getSerialNumber()}</h5><h5>Date: ${getDate()}</h5>`;
            this.clock_tests_html = "";
            this.volt_tests_html = "";
            this.current_tests_html = "";
            this.resistor_tests_html = ["","","","","","",""];
        } else {
            reporting = false;
            $('#test-report-button').text("Start Generating Report");
            this.clock_tests_html += "</tbody></table></div>";
            this.volt_tests_html += "</tbody></table></div>";
            this.current_tests_html += "</tbody></table></div>";
            this.report_window_html += this.clock_tests_html;
            this.report_window_html += this.volt_tests_html;
            this.report_window_html += this.current_tests_html;
            for (var i=0;i<7;i++)
            {
                if (this.resistor_tests_html[i].length>1) {
                    this.resistor_tests_html[i] += "</tbody></table></div>";
                    this.report_window_html += this.resistor_tests_html[i];
                }
            }
            this.report_window_html += "</body></html>";
            report_window = window.open();
            report_window.document.write(this.report_window_html);
            report_window.stop();
            report_window.print();
        }
    };

App.prototype.testClock =
    function()
    {
        $('#test-clock-button').attr('disabled', true);
        var measuredTest = [];
        var testCaseString = document.getElementById("test-clock-input").value;
        if(testCaseString.length == 0)
        {
            testCases = [10,50,100,20];
        } 
        else
        {
            testCases = testCaseString.split(',');
            for(var i=0; i<testCases.length; i++)
            {
                if(isNaN(testCases[i]) || testCases[i].length==0)
                {
                    if (confirm('Invalid test case: ' +  testCases[i] + ' is not a number. Continue?')) {
                        testCases.splice(i,1);
                        i -= 1;
                    } else {
                        $('#test-clock-button').attr('disabled', false);
                        return;
                    }
                } else if(testCases[i]<10 || testCases[i]>945){
                    if (confirm("Invalid test case: " + testCases[i] + " is not in the clocks range of 10 - 945. Continue?")) {
                        testCases.splice(i,1);
                        i -= 1;
                    } else {
                        $('#test-clock-button').attr('disabled', false);
                        return;
                    }
                } else {
                    testCases[i] = +testCases[i];
                }
            }
        }
        for(var i=0; i<testCases.length; i++)
        {
            this.put("clock",testCases[i]);
            measured = getMeasure(0,1,testCases[i]);
            if (measured == null){
                $('#test-clock-button').attr('disabled', false);
                return;
            }
            measuredTest.push(measured);
        }
        var clock_test_html = ""
        if(!reporting) {
            clock_test_html += "<html><head><style>table, th, td {border: 1px solid black;border-collapse: collapse;padding: 5px;} td {text-align: right;}</style></head>";
            clock_test_html += `<body><h5>Backplane Serial Number: ${getSerialNumber()}</h5><h5>Date: ${getDate()}</h5>`;
        }
        if(!reporting || this.clock_tests_html.length==0){
            clock_test_html += "<h4>Clock Test Results</h4><div class='table-container'><table>";
            clock_test_html += "<thead><tr><th>Expected</th><th>Measured</th></tr></thead><tbody>";
        } else {
            clock_test_html += `<tr><td></td><td></td></tr>`; 
        }
        for(var i=0; i<testCases.length; i++)
        {
            clock_test_html += `<tr><td>${testCases[i]}</td><td>${measuredTest[i]}</td></tr>`; 
        }
        if(!reporting){ 
            clock_test_html += "</tbody></table></div>";
            clock_test_html += "</body></html>";
            clock_test_window = window.open();
            clock_test_window.document.write(clock_test_html);
            clock_test_window.stop();
        } else {
        this.clock_tests_html += clock_test_html;
        }
        $('#test-clock-button').attr('disabled', false);
    };


App.prototype.testVolt =
    function()
    {
        $('#test-volt-button').attr('disabled', true);
        expectedValue = [2459,2459,3415,2459,2459,2459,2459,1474,2702,2702,1638,0,0];
        expectedMaxValue ={7:2702,10:0,11:2702,12:2702};
        resistLocation = {7:3,10:5,11:4,12:5};
        var promises = [];
        var testSupplies = [];
        var testLocation = [];
        var baseValue = [];
        var expectedTest = [];
        var expectedMax = {};
        var testingRange = [];
        parentThis = this;
        for(var i=0; i<13; i++)
        {
            if(document.getElementById('volt-check-' + i).checked == true)
            {
                testSupplies.push(document.getElementById('volt-check-' + i).value);
                expectedTest.push(expectedValue[i]);
                if (i==7 || i>9) {
                    expectedMax[testSupplies.length-1] = expectedMaxValue[i];
                    testingRange.push(true);
                } else {
                    testingRange.push(false);
                }
                promises.push(apiGET(this.current_adapter, "current_voltage/" + i + "/voltage_register", false));
            }
        }
        if(testSupplies.length == 0) {
            alert("Please select the power supplies you wish to test");
            $('#test-volt-button').attr('disabled', false);
            return;
        }
        $.when.apply($, promises).then(function() {
            var volt_test_html = "";
            if(!reporting) {
                volt_test_html += "<html><head><style>table, th, td {border: 1px solid black;border-collapse: collapse;padding: 5px;} td {text-align: right;}</style></head>";
                volt_test_html += `<body><h5>Backplane Serial Number: ${getSerialNumber()}</h5><h5>Date: ${getDate()}</h5>`;
            }
            if(!reporting || parentThis.volt_tests_html.length==0) {
                volt_test_html += "<h4>Voltage Test Results</h4><div class='table-container'><table>";
            }
            if (!reporting && testingRange.every(x => x == false)) {
                volt_test_html += "<thead><tr><td></td><th>Expected</th><th>Measured</th></tr></thead><tbody>";
                if(testSupplies.length==1) {
                    volt_test_html += `<tr><th>${testSupplies[0]}</th><td>${expectedTest[0]}</td><td>${arguments[0]['voltage_register'].toString()}</td></tr>`;
                } else {
                    for(var i=0; i<promises.length; i++)
                    {
                        volt_test_html += `<tr><th>${testSupplies[i]}</th><td>${expectedTest[i]}</td><td>${arguments[i][0]['voltage_register'].toString()}</td></tr>`;
                    }
                }
            } else {
                if (!reporting || parentThis.volt_tests_html.length==0) {
                    volt_test_html += "<thead><tr><td></td><th>Expected Min</th><th>Measured</th><th>Expected Max</th></tr></thead><tbody>";
                } else {
                    volt_test_html += `<tr><th></th><td></td><td></td><td></td></tr>`;
                }
                if(testSupplies.length==1) {
                    if(testingRange[i]) {
                        volt_test_html += `<tr><th>${testSupplies[0]}</th><td>${expectedTest[0]}</td><td>${arguments[0]['voltage_register'].toString()}</td><td>${expectedMax[0]}</td></tr>`;
                    } else {
                        volt_test_html += `<tr><th>${testSupplies[0]}</th><td>${expectedTest[0]}</td><td>${arguments[0]['voltage_register'].toString()}</td><td></td></tr>`;
                    }
                } else {
                    for(var i=0; i<promises.length; i++){
                        if(testingRange[i]) {
                            volt_test_html += `<tr><th>${testSupplies[i]}</th><td>${expectedTest[i]}</td><td>${arguments[i][0]['voltage_register'].toString()}</td><td>${expectedMax[i]}</td></tr>`;
                        } else {
                            volt_test_html += `<tr><th>${testSupplies[i]}</th><td>${expectedTest[i]}</td><td>${arguments[i][0]['voltage_register'].toString()}</td><td></td></tr>`;
                        }
                    }
                }
            }
            if(!reporting) {
                volt_test_html += "</tbody></table></div></body></html>";
                volt_test_window = window.open();
                volt_test_window.document.write(volt_test_html);
                volt_test_window.stop();
            } else {
                parentThis.volt_tests_html += volt_test_html;
            }
            $('#test-volt-button').attr('disabled', false);
        }, function() {
            this.setError.bind(this);
        });
    };

App.prototype.testCurrent =
    function()
    {
        $('#test-current-button').attr('disabled', true);
        expectedValue = [[20,41],[8,16],[9,18],[8,16],[82,164],[8,16],[82,164],[20,41],[20,41],[20,41],[49,98],[20,41],[82,164]];
        neededResistor = [180,180,220,180,180,180,180,330,330,330,330,330,330];
        neededConnector = [75,42,74,41,76,33,77,34,36,35,78,40,78];
        var promisesBase = [];
        var promisesGet = [];
        var promisesNext = [];
        var testSupplies = [];
        var testLocation = [];
        var expectedTest = [];
        var measuredTest = [];
        var measuredBase = [];
        parentThis = this;
        for(var i=0; i<13; i++)
        {
            if(document.getElementById('volt-check-' + i).checked == true)
            {
                testLocation.push(i)
                testSupplies.push(document.getElementById('volt-check-' + i).value);
                expectedTest.push(expectedValue[i]);
                promisesBase.push(apiGET(this.current_adapter, "current_voltage/" + i + "/current_register", false));
            }
        }
        if(testSupplies.length == 0)
        {
            alert("Please select the power supplies you wish to test");
            $('#test-current-button').attr('disabled', false);
            return;
        }
        for(var i=0; i<promisesBase.length; i++)
        {
            $.when.apply($, promisesBase[i]).then(function() {
                alert(`Please input a ${neededResistor[testLocation[i]]}R resistor across PL${neededConnector[testLocation[i]]}`);
                promisesGet.push(apiPUT(parentThis.current_adapter, "update_required", true));
            }, function() {
                this.setError.bind(this);
            });
        }
        $.when.apply($, promisesBase).then(function() {
            for(var i=0; i<promisesGet.length; i++)
            {
                $.when.apply($, promisesGet[i]).then(function() {
                    promisesNext.push(apiGET(parentThis.current_adapter, "current_voltage/" + testLocation[i] + "/current_register", false));
                }, function() {
                    this.setError.bind(this);
                });
            }
            measuredBase = arguments;
            $.when.apply($, promisesGet).then(function() {
                $.when.apply($, promisesNext).then(function() {
                    var current_test_html = "";
                    if(!reporting) {
                        current_test_html += "<html><head><style>table, th, td {border: 1px solid black;border-collapse: collapse;padding: 5px;} td {text-align: right;}</style></head>";
                        current_test_html += `<body><h5>Backplane Serial Number: ${getSerialNumber()}</h5><h5>Date: ${getDate()}</h5>`;
                    }
                    if(!reporting || parentThis.current_tests_html.length==0){
                        current_test_html += "<h4>Current Test Results</h4><div class='table-container'><table>";
                        current_test_html += "<thead><tr><td></td><th>Current</th><th>Expected</th><th>Measured</th></tr></thead><tbody>";
                    } else {
                        current_test_html += `<tr><th></th><td></td><td></td><td></td></tr>`;
                    }
                    if(testSupplies.length==1)
                    {
                        current_test_html += `<tr><th>${testSupplies[0]}</th><td>10mA</td><td>${expectedTest[0][0]}</td><td>${measuredBase[0]['current_register'].toString()}</td></tr>`;
                        current_test_html += `<tr><td></td><td>20mA</td><td>${expectedTest[0][1]}</td><td>${arguments[0]['current_register'].toString()}</td></tr>`;
                    }
                    else
                    {
                        for(var i=0; i<promisesBase.length; i++)
                        {
                            current_test_html += `<tr><th>${testSupplies[i]}</th><td>10mA</td><td>${expectedTest[i][0]}</td><td>${measuredBase[i][0]['current_register'].toString()}</td></tr>`;
                            current_test_html += `<tr><td></td><td>20mA</td><td>${expectedTest[i][1]}</td><td>${arguments[i][0]['current_register'].toString()}</td></tr>`;
                        }
                    }
                    if(!reporting) {
                        current_test_html += "</tbody></table></div></body></html>";
                        current_test_window = window.open();
                        current_test_window.document.write(current_test_html);
                        current_test_window.stop();
                    } else {
                        parentThis.current_tests_html += current_test_html;
                    }
                    $('#test-current-button').attr('disabled', false);
                }, function() {
                    this.setError.bind(this);
                });
            }, function() {
                this.setError.bind(this);
            });
        }, function() {
            this.setError.bind(this);
        });
    };

var resistTestCases = [];
var measuredResist = [];
var expectedResist = [];
resistName = ["AUXRESET","VCM","DACEXTREF","VDD RST","VRESET","VCTRL","AUXSAMPLE"];
lookupResistVolt = {3:7,4:11,5:[12,10]};
resistLocation = ["PL47 Pin 2 and Ground","PL46 Pin 2 and Ground","PL43 Pin 1 and Ground","PL34 Pins 1 and 2","PL40 Pins 1 and 2","PL78 Pins 1 and 2","PL45 Pin 2 and Ground"];
resistUnits = ["V","V","mA","V","V","V","V"];

App.prototype.testResist =
    function(type)
    {
        $('#test-resist-button-0').attr('disabled', true);
        $('#test-resist-button-1').attr('disabled', true);
        var testCases = [];
        if (document.getElementById("test-resist-cases-container").style.display != "none") {
            var testCaseString = document.getElementById("test-resist-input-cases").value;
            if(testCaseString.length == 0)
            {
                alert("Please enter test cases");
                $('#test-resist-button-0').attr('disabled', false);
                $('#test-resist-button-1').attr('disabled', false);
                return;
            }
            else
            {
                testCases = testCaseString.split(',');
                for(var i=0; i<testCases.length; i++)
                {
                    if(isNaN(testCases[i]) || testCases[i].length==0)
                    {
                        if (confirm("Invalid test case: " + testCases[i] + " is not a number. Continue?")) {
                            testCases.splice(i,1);
                            i -= 1;
                        } else {
                            $('#test-resist-button-0').attr('disabled', false);
                            $('#test-resist-button-1').attr('disabled', false);
                            return;
                        }
                    }
                    testCases[i] = +testCases[i];
                }
            }
        } else {
            var testCaseMin = document.getElementById("test-resist-input-min").value;
            var testCaseMax = document.getElementById("test-resist-input-max").value;
            var testCaseStep = document.getElementById("test-resist-input-step").value;
            if(testCaseMin.length == 0) {
                testCaseMin = 0;
            } else if(isNaN(testCaseMin)) {
                alert('Invalid Minimun: ' +  testCaseMin + ' is not a number');
                $('#test-resist-button-0').attr('disabled', false);
                $('#test-resist-button-1').attr('disabled', false);
                return;
            } else {
                testCaseMin = +testCaseMin;
                if(testCaseMin<0 || testCaseMin>255) {
                    alert('Invalid Minimun: ' + testCaseMin + ' is not in range 0 - 255');
                    $('#test-resist-button-0').attr('disabled', false);
                    $('#test-resist-button-1').attr('disabled', false);
                    return;
                }
            }
            if(testCaseMax.length == 0) {
                testCaseMax = 255;
            } else if(isNaN(testCaseMax)) {
                alert('Invalid Maximum: ' +  testCaseMax + ' is not a number');
                $('#test-resist-button-0').attr('disabled', false);
                $('#test-resist-button-1').attr('disabled', false);
                return;
            } else {
                testCaseMax = +testCaseMax;
                if(testCaseMax<testCaseMin || testCaseMax>255) {
                    alert('Invalid Maximum: ' + testCaseMax + ' is not in range ' + testCaseMin + ' - 255');
                    $('#test-resist-button-0').attr('disabled', false);
                    $('#test-resist-button-1').attr('disabled', false);
                    return;
                }
            }
            if(testCaseStep.length == 0) {
                testCaseStep = 17;
            } else if(isNaN(testCaseStep)) {
                alert('Invalid Minimun: ' +  testCaseStep + ' is not a number');
                $('#test-resist-button-0').attr('disabled', false);
                $('#test-resist-button-1').attr('disabled', false);
                            parentThis.resistor_tests_html[resistor] += resist_test_html;
return;
            } else {
                testCaseStep = +testCaseStep;
                if(testCaseStep<1) {
                    alert('Invalid Step: ' + testCaseStep + ' is not positive');
                    $('#test-resist-button-0').attr('disabled', false);
                    $('#test-resist-button-1').attr('disabled', false);
                    return;
                }
            }
            var numCases = 1 + Math.floor((testCaseMax-testCaseMin)/testCaseStep);
            testCases = Array.apply(null, Array(numCases)).map(function (_, i) {return (testCaseMin + testCaseStep*i);});
        }
        for(var i=0; i<7; i++)
        {
            if(document.getElementById('resist-check-' + i).checked == true)
            {
                resistTestCases = testCases.slice(0);
                measuredResist = [];
                expectedResist = [];
                if (type==1) {
                    if (i>2 && i<6) {
                        testingResistCalculate(i,testCases,this);
                    } else {
                        alert("Automatic test may only be run on VDD RST, VRESET and VCTRL");
                        $('#test-resist-button-0').attr('disabled', false);
                        $('#test-resist-button-1').attr('disabled', false);
                    }
                } else {
                    if(i==2) {
                        alert("Please supply 1V at PL43 Pin 1 to restrict the current.");
                    } else if(i==4) {
                        alert("Please ensure the jumper is on PL19 Pins 1 and 2");
                    }
                    testingResist(i,testCases,this);
                }
            }
        }
    };


function testingResist(resistor,testCases, parentThis) {
    if(testCases.length>0)
    {
        apiPUT(parentThis.current_adapter, "resistors/" + resistor + "/register_value",testCases[0])
        .done(
            function()
            {
                var measured = getMeasure(1,1,0,resistor);
                if (measured==null){
                    $('#test-resist-button-0').attr('disabled', false);
                    $('#test-resist-button-1').attr('disabled', false);
                    return;
                }
                measuredResist.push(parseFloat(measured).toFixed(3));
                var expected = expectResist(resistor,testCases[0]).toFixed(3);
                expectedResist.push(expected);
                testCases.shift();
                testingResist(resistor,testCases, parentThis);
            }
        )
        .fail(this.setError.bind(this));
    }
    else
    {
        var resist_test_html = ""
        if(!reporting) {
            resist_test_html += "<html><head><style>table, th, td {border: 1px solid black;border-collapse: collapse;padding: 5px;} td {text-align: right;}</style></head>";
            resist_test_html += `<body><h5>Backplane Serial Number: ${getSerialNumber()}</h5><h5>Date: ${getDate()}</h5>`;
        }
        if(!reporting || parentThis.resistor_tests_html[resistor].length==0){
            resist_test_html += `<h4>${resistName[resistor]} Test Results</h4><div class='table-container'><table>`;
            resist_test_html += "<thead><tr><th>Register</th><th>Expected</th><th>Measured</th></tr></thead><tbody>";
        } else {
            resist_test_html += `<tr><td></td><td></td><td></td></tr>`;
        }
        for(var i=0; i<measuredResist.length; i++)
        {
            resist_test_html += `<tr><td>${resistTestCases[i]}</td><td>${expectedResist[i]}</td><td>${measuredResist[i]}</td></tr>`;
        }
        if(!reporting) {
            resist_test_html += "</tbody></table></div></body></html>";
            resist_test_window = window.open();
            resist_test_window.document.write(resist_test_html);
            resist_test_window.stop();
        } else {
            parentThis.resistor_tests_html[resistor] += resist_test_html;
        }
        $('#test-resist-button-0').attr('disabled', false);
        $('#test-resist-button-1').attr('disabled', false);
    }
}

var myChart;

function testingResistCalculate(resistor,testCases, parentThis) {
    if(testCases.length>0)
    {
        apiPUT(parentThis.current_adapter, "resistors/" + resistor + "/register_value",testCases[0])
        .done(
            function()
            {
                var expected = expectResist(resistor,testCases[0]).toFixed(3);
                expectedResist.push(expected);
                testCases.shift();
                if(resistor==5) {
                    if(expected>0) {
                        var ResistVolt = lookupResistVolt[5][0];
                    } else {
                        var ResistVolt = lookupResistVolt[5][1];
                    }
                } else {
                    var ResistVolt = lookupResistVolt[resistor];
                }
                setTimeout(function() {
                    apiGET(parentThis.current_adapter, "current_voltage/" + ResistVolt + "/voltage", false)
                    .done(
                        function(measured)
                        {
                            measuredResist.push(measured['voltage'].toFixed(3));
                            testingResistCalculate(resistor,testCases, parentThis);
                        }
                    )
                    .fail(this.setError.bind(this));
                }, 40);
            }
        )
        .fail(this.setError.bind(this));
    }
    else
    {
        var resist_test_html = "";
        if (!reporting) {
            resist_test_html += "<html><head><style>table, th, td {border: 1px solid black;border-collapse: collapse;padding: 5px;} td {text-align: right;}</style></head>";
            resist_test_html += `<body><script src="js/chart.js/dist/Chart.js" type="text/javascript"></script>`;
            resist_test_html += `<h5>Backplane Serial Number: ${getSerialNumber()}</h5><h5>Date: ${getDate()}</h5>`;
        }
        if (!reporting || parentThis.resistor_tests_html[resistor].length==0){
            resist_test_html += `<h4>${resistName[resistor]} Automatic Test Results</h4>`;
//            resist_test_html += "<div><canvas id="myChart1"></canvas></div>";
            resist_test_html += `<div class='table-container'><table>`;
            resist_test_html += "<thead><tr><th>Register</th><th>Expected</th><th>Calculated</th></tr></thead><tbody>";
        } else {
            resist_test_html += `<tr><td></td><td></td><td></td></tr>`;
        }
        for(var i=0; i<measuredResist.length; i++)
        {
            resist_test_html += `<tr><td>${resistTestCases[i]}</td><td>${expectedResist[i]}</td><td>${measuredResist[i]}</td></tr>`;
        }
        if (!reporting) {
            resist_test_html += "</tbody></table></div></body></html>";
            resist_test_window = window.open();
            resist_test_window.document.write(resist_test_html);
            resist_test_window.stop();

            var resistor_data = [];
            for(var i=0; i<measuredResist.length; i++) {
                var p = {x:resistTestCases[i],y:measuredResist[i]}
                resistor_data.push(p);
            }
            var ctx = document.getElementById("myChart");
            if (parentThis.myChart != null) {
               parentThis.myChart.destroy();
            }
            parentThis.myChart = new Chart(ctx, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: 'Tester 1',
                        data: resistor_data
                    }]
                },
                options: {
                    showLines: true,
                }
            });
        } else {
            parentThis.resistor_tests_html[resistor] += resist_test_html;
        }
        $('#test-resist-button-0').attr('disabled', false);
        $('#test-resist-button-1').attr('disabled', false);
    }
}

function expectResist(resistor,test) {
    if(resistor==4) { 
          return (0.0001 * (49900 * (390 * test)) / (49900 + (390 * test)));
    } else if(resistor==3) {   
          return(0.0001 * (17800 + (18200 * (390 * test)) / (18200 + (390 * test))));
    } else if(resistor==5) {
        return (test * .021 - 2.02);
    } else if(resistor==2) {
        return (400 * (test * 390/(test * 390 + 294000)));
    } else {
        return (3.3 * (390 * test) / (390 * test + 32000));
    }
}


App.prototype.setError =
    function(data)
    {
        if(data.hasOwnProperty("json"))
        {
            var json = data.responseJSON;
            if(json.hasOwnProperty("error"))
                this.showError(json.error);
        }
        else
        {
            this.showError(data.responseText);
        }
    }

App.prototype.showError =
    function(msg)
    {
        if(this.error_timeout !== null) clearTimeout(this.error_timeout);
        this.error_message.nodeValue = `Error: ${msg}`;
        this.error_timeout = setTimeout(this.clearError.bind(this), 5000);
    }

App.prototype.clearError =
    function()
    {
        this.error_message.nodeValue = "";
    };

App.prototype.put =
    function(path, val)
    {
        apiPUT(this.current_adapter, path, val)
        .fail(this.setError.bind(this));
        return;
    };

App.prototype.updateFrequency =
    function()
    {
        document.getElementById("frequency-value").placeholder = (Math.round(100 / this.update_delay) / 100).toString();
        this.freq_overlay.classList.remove("hidden");
    };

App.prototype.frequencyCancel =
    function()
    {
        this.freq_overlay.classList.add("hidden");
    };

App.prototype.frequencySet =
    function()
    {
        var val = document.getElementById("frequency-value").value;
        var new_delay = 1 / parseFloat(val);

        if(isNaN(new_delay) || !isFinite(new_delay))
            this.showError("Update frequency must be a valid number");
        else
            this.update_delay = new_delay;

        document.getElementById("frequency-value").value = "";
        this.freq_overlay.classList.add("hidden");        
    };

App.prototype.toggleDark =
    function()
    {
        this.dark_mode = !this.dark_mode;
        this.setCookie("dark", this.dark_mode.toString());

        this.mount.classList.toggle("dark");
        this.documentBody.classList.toggle("background-dark");
    };

App.prototype.rawQuery =
    function()
    {
        this.query_overlay.classList.remove("hidden");
    };

App.prototype.queryCancel =
    function()
    {
        this.query_overlay.classList.add("hidden");
    };

App.prototype.queryPut =
    function()
    {
        this.put(document.getElementById("query-url").value, JSON.parse(document.getElementById("query-body").value));
    };

App.prototype.queryGet =
    function()
    {
        apiGET(this.current_adapter, document.getElementById("query-url").value, document.getElementById("query-meta").checked)
        .done(
            function(data)
            {
                document.getElementById("query-body").value = JSON.stringify(data);
            }
        )
        .fail(this.setError.bind(this));
    };

App.prototype.getCookie =
    function(key)
    {
        var raw = document.cookie.split(';');
        for(var value of raw)
        {
            if(value.indexOf(key) == 0)
                return decodeURIComponent(value.substring(key.length + 1));
        }
    };

App.prototype.setCookie =
    function(key, value)
    {
        var date = new Date();
        date.setTime(date.getTime() + 30 * (24 * 60 * 60 * 1000));
        var expires = `expires=${date.toUTCString()}`;

        var raw = document.cookie.split(';');
        raw = raw.filter((itm) => itm.indexOf("path") !== 0
                                && itm.indexOf("expires") !== 0
                                && itm.length > 0);
        var cookieString = `${key}=${encodeURIComponent(value)}`;
        var found = false;
        for(var i = 0; i < raw.length; i++)
            if(raw[i].indexOf(key) === 0)
            {
                raw[i] = cookieString;
                found = true;
            }
        if(!found)
            raw.push(cookieString);
        var s = `${raw.join(';')};${expires};path=/`;
        document.cookie = `${raw.join(';')};${expires};path=/`;
    };

//Create the App() instance
function initApp()
{
    var app = new App();
}
