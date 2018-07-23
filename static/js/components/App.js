function App()
{
    this.mount = document.getElementById("app");
    this.error_message = null;
    this.error_timeout = null;
    this.current_adapter = 0

//Retrieve metadata for each adapter
var meta = {};
var promises = adapters.map(
    function(adapter, i) {
        return apiGET(i, "", true).then(
            function(data) {
                meta[adapter] = data;
                this.current_adapter = i
            }
        );
    }
);

//Then generate the page and start the update loop
$.when.apply($, promises).then(
    (function() {
        this.generate(meta["interface"]);
        if (meta["interface"]["sensors_enabled"]["value"] == "True") {
            this.updateLoop_bp();
        }
        if (meta["interface"]["non_volatile"]["value"] == "True") {
            this.setVolatile();
        }
    }).bind(this)
);
}

App.prototype.freq_overlay = null;
App.prototype.update_delay = 0.5;
App.prototype.dark_mode = false;

//Construct page and call components to be constructed
App.prototype.generate =
    function(data) {
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
            </ul>
        </li>
    </ul>
</div>`;
        this.mount.appendChild(navbar);
        document.getElementById("update-freq").addEventListener("click", this.updateFrequency.bind(this));
        document.getElementById("toggle-dark").addEventListener("click", this.toggleDark.bind(this));
        this.documentBody = document.getElementsByTagName("body")[0];
        var nav_list = document.getElementById("adapter-links");

        //Create error bar
        var error_bar = document.createElement("div");
        error_bar.classList.add("error-bar");
        this.mount.appendChild(error_bar);
        this.error_message = document.createTextNode("");
        error_bar.appendChild(this.error_message);

        //Add Configuration Page
        //Create DOM node for adapter
       var container = document.createElement("div");
       container.id = "configuration-page";
       container.classList.add("adapter-page");
       container.innerHTML = `
<div id="configure-container" class="flex-container">
<div class="parent-column">
<h4>Configuration</h4>
<p class="desc">
    Configuration options for the ASIC and Backplane
    </p>
<div class="vertical">
    <div>
        <h5>
            Clock:
        </h5>
        <div class="variable-padding">
            <div class="padder"></div>
        </div>
        <div>
<div class="input-group" title="Clock frequency for the SI570 oscillator">
    <input class="form-control text-right" id="clock-input" aria-label="Value" placeholder=` + Number(data["clock"]["value"]).toFixed(1).toString() + ` type="text">
    <span class="input-group-addon">MHz</span>
    <div class="input-group-btn">
        <button class="btn btn-default" id="clock-button" type="button">Set</button>
    </div>
</div>
        </div>
    </div>

    <div>
        <h5>
            Refresh Backplane:
        </h5>
        <div class="variable-padding">
            <div class="padder"></div>
        </div>
        <div>
<button id="bp-refresh-button" type="button" class="btn btn-default">Update</button>
        </div>
    </div>

    <div>
        <h5>
            Backplane Updating:
        </h5>
        <div class="variable-padding">
            <div class="padder"></div>
        </div>
        <div>
<button id="bp-update-button" type="button" class="btn btn-toggle btn-danger">Disabled</button>
        </div>
    </div>

    <div>
        <h5>
            Reload Backplane:
        </h5>
        <div class="variable-padding">
            <div class="padder"></div>
        </div>
        <div>
<button id="bp-reload-button" type="button" class="btn btn-default">Reload</button>
        </div>
    </div>

</div>
</div>
    <div class ="child-column">
        <div class="child">
            <div class="child-header">
                <div id="ASIC-collapse" class="collapse-button">
                    <div class="collapse-table">
                        <span id="ASIC-button-symbol" class="collapse-cell    glyphicon glyphicon-triangle-bottom"></span>
                    </div>
                </div>
                <h4>ASIC</h4>
            </div>
            <div id="ASIC-container">
                <div class="flex-container">
                    <h5>Image Capture Vector File:</h5>
                    <div>
                        <input id="capture-vector-input" class="form-control text-right" placeholder=" " type="file">
                    </div>
                </div>
                <div class="flex-container">
                    <h5>ASIC Configuration Vector File:</h5>
                    <div>
                        <input id="configure-vector-input" class="form-control text-right" placeholder=" " type="file">
                    </div>
                </div>
            </div>
        </div>

        <div class="child">
            <div class="child-header">
                <div id="DAC-collapse" class="collapse-button">
                    <div class="collapse-table">
                        <span id="DAC-button-symbol" class="collapse-cell    glyphicon glyphicon-triangle-bottom"></span>
                    </div>
                </div>
                <h4>DAC</h4>
            </div>
            <div id="DAC-container" class="flex container">
                <div class="table-container">
<table>
    <thead>
        <tr>
            <td></td>
            <th>Value</th>
            <td></td>
            <th>Value</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th class="text-right">iBiasPLL</th>
            <td>
                <div class="input-group">
                    <input class="form-control text-right" id="DAC-0-input" aria-label="Value" placeholder="010100" type="text">
                </div>
            </td>
            <th class="text-right">iBiasCalC</th>
            <td>
                <div class="input-group">
                    <input class="form-control text-right" id="DAC-10-input" aria-label="Value" placeholder="001100" type="text">
                </div>
            </td>
        </tr>
        <tr>
            <th class="text-right">iBiasLVDS</th>
            <td>
                <div class="input-group">
                    <input class="form-control text-right" id="DAC-1-input" aria-label="Value" placeholder="101101" type="text">
                </div>
            </td>
            <th class="text-right">iBiasADCbuffer</th>
            <td>
                <div class="input-group">
                    <input class="form-control text-right" id="DAC-11-input" aria-label="Value" placeholder="001100" type="text">
                </div>
            </td>
        </tr>
        <tr>
            <th class="text-right">iBiasAmpLVDS</th>
            <td>
                <div class="input-group">
                    <input class="form-control text-right" id="DAC-2-input"  aria-label="Value" placeholder="010000" type="text">
                </div>
            </td>
            <th class="text-right">iBiasLoad</th>
            <td>
                <div class="input-group">
                    <input class="form-control text-right" id="DAC-12-input" aria-label="Value" placeholder="001010" type="text">
                </div>
            </td>
        </tr>
        <tr>
            <th class="text-right">iBiasADC2</th>
            <td>
                <div class="input-group">
                    <input class="form-control text-right" id="DAC-3-input" aria-label="Value" placeholder="010100" type="text">
                </div>
            </td>
            <th class="text-right">iBiasOutSF</th>
            <td>
                <div class="input-group">
                    <input class="form-control text-right" id="DAC-13-input" aria-label="Value" placeholder="011001" type="text">
                </div>
            </td>
        </tr>
        <tr>
            <th class="text-right">iBiasADC1</th>
            <td>
                <div class="input-group">
                    <input class="form-control text-right" id="DAC-4-input" aria-label="Value" placeholder="010100" type="text">
                </div>
            </td>
            <th class="text-right">iBiasSF1</th>
            <td>
                <div class="input-group">
                    <input class="form-control text-right" id="DAC-14-input" aria-label="Value" placeholder="001010" type="text">
                </div>
            </td>
        </tr>
        <tr>
            <th class="text-right">iBiasCalF</th>
            <td>
                <div class="input-group">
                    <input class="form-control text-right" id="DAC-5-input" aria-label="Value" placeholder="010010" type="text">
                </div>
            </td>
            <th class="text-right">iBiasPGA</th>
            <td>
                <div class="input-group">
                    <input class="form-control text-right" id="DAC-15-input" aria-label="Value" placeholder="001100" type="text">
                </div>
            </td>
        </tr>
        <tr>
            <th class="text-right">iFbiasN</th>
            <td>
                <div class="input-group">
                    <input class="form-control text-right" id="DAC-6-inputt" aria-label="Value" placeholder="011000" type="text">
                </div>
            </td>
            <th class="text-right">vBiasPGA</th>
            <td>
                <div class="input-group">
                    <input class="form-control text-right" id="DAC-16-input" aria-label="Value" placeholder="000000" type="text">
                </div>
            </td>
        </tr>
        <tr>
            <th class="text-right">vBiasCasc</th>
            <td>
                <div class="input-group">
                    <input class="form-control text-right" id="DAC-7-input" aria-label="Value" placeholder="100000" type="text">
                </div>
            </td>
            <th class="text-right">iBiasSF0</th>
            <td>
                <div class="input-group">
                    <input class="form-control text-right" id="DAC-17-input" aria-label="Value" placeholder="000101" type="text">
                </div>
            </td>
        </tr>
        <tr>
            <th class="text-right">iCbiasP</th>
            <td>
                <div class="input-group">
                    <input class="form-control text-right" id="DAC-8-input" aria-label="Value" placeholder="011010" type="text">
                </div>
            </td>
            <th class="text-right">iBiasCol</th>
            <td>
                <div class="input-group">
                    <input class="form-control text-right" id="DAC-18-input" aria-label="Value" placeholder="001100" type="text">
                </div>
            </td>
        </tr>
        <tr>
            <th class="text-right">iBiasRef</th>
            <td>
                <div class="input-group">
                    <input class="form-control text-right" id="DAC-9-input" aria-label="Value" placeholder="001010" type="text">
                </div>
            </td>
        </tr>
    </tbody>
</table>
                </div>
                <div class="flex container">
                    <h5>Image Capture Pattern</h5>
                    <div class="input-group-btn">
                        <button id="load-cap-pattern-button" class="btn btn-default" type="button">Load</button>
                        <button id="save-cap-pattern-button" class="btn btn-default" type="button">Save</button>
                    </div>
                </div>
                <div class="flex container">
                    <h5>ASIC Configuration Pattern</h5>
                    <div class="input-group-btn">
                        <button id="load-conf-pattern-button" class="btn btn-default" type="button">Load</button>
                        <button id="save-conf-pattern-button" class="btn btn-default" type="button">Save</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="child">
            <div class="child-header">
                <div id="variable-supply-collapse" class="collapse-button">
                    <div class="collapse-table">
                        <span id="variable-supply-button-symbol" class="collapse-cell    glyphicon glyphicon-triangle-bottom"></span>
                    </div>
                </div>
                <h4>Backplane Variable Supplies</h4>
            </div>
            <div id="variable-supply-container" class="flex-container">
                <div class="table-container">` + this.generateResistors(data["resistors"]) + `
                </div>
                <div>
                    <h5>
                        Change Default Values?:
                    </h5>
                    <div class="variable-padding">
                        <div class="padder"></div>
                    </div>
                    <div>
                        <button id="resistor-volatile-button" type="button" class="btn btn-toggle btn-danger">No</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="child">
            <div class="child-header">
                <div id="static-supply-collapse" class="collapse-button">
                    <div class="collapse-table">
                        <span id="static-supply-button-symbol" class="collapse-cell    glyphicon glyphicon-triangle-bottom"></span>
                    </div>
                </div>
                <h4>Backplane Static Supplies</h4>
            </div>
            <div id="static-supply-container" class="flex-container">
                <div class="table-container">` + this.generateSupplies(data["current_voltage"]) + `
                </div>
            </div>
        </div>
    </div>
</div>
`;

       this.mount.appendChild(container);

       document.getElementById("ASIC-collapse").addEventListener("click", this.toggleCollapsed.bind(this, "ASIC"));
       document.getElementById("DAC-collapse").addEventListener("click", this.toggleCollapsed.bind(this, "DAC"));
       document.getElementById("variable-supply-collapse").addEventListener("click", this.toggleCollapsed.bind(this, "variable-supply"));
       document.getElementById("static-supply-collapse").addEventListener("click", this.toggleCollapsed.bind(this, "static-supply"));

       document.getElementById('clock-button').addEventListener("click", this.setClock.bind(this));
       document.getElementById('bp-refresh-button').addEventListener("click", this.update_bp.bind(this));
       document.getElementById('bp-update-button').addEventListener("click", this.updateLoop_bp.bind(this));
       document.getElementById('bp-reload-button').addEventListener("click", this.reload_bp.bind(this));

       for (i=0; i<data["resistors"].length; i++) {
           document.getElementById("resistor-" + i.toString() + "-button").addEventListener("click", this.setResistor.bind(this, i.toString()));
       };
       document.getElementById('resistor-volatile-button').addEventListener("click", this.setVolatile.bind(this));

       //Update navbar
       var list_elem = document.createElement("li");
       nav_list.appendChild(list_elem);
       var link = document.createElement("a");
       link.href = "#";
       list_elem.appendChild(link);
       var link_text = document.createTextNode("Configuration");
       link.appendChild(link_text);
       link.addEventListener("click", this.changePage.bind(this, "Configuration"));

        document.getElementById("configuration-page").classList.add("active");

        //Add Capture Page
        var container = document.createElement("div");
        container.id = "image-capture-page";
        container.classList.add("adapter-page");
        container.innerHTML = `
<div id="image-capture-container" class="flex-container">
<div class ="parent-column">
    <h4>Image Display</h4>
    <div class="vertical">
        <div id="image-container">
            <div>
                <img id="image_display" src="img/temp_image.png">
            </div>
            <div class="input-group-btn">
                <button id="display-single-button" class="btn btn-default" type="button">Single Frame</button>
                <button id="display-continuous-button" class="btn btn-default" type="button">Continuous</button>
            </div>
        </div>
    </div>
</div>
<div class ="child-column">
    <div class="child">
        <div class="child-header">
            <div id="capture-collapse" class="collapse-button">
                <div class="collapse-table">
                    <span id="capture-button-symbol" class="collapse-cell    glyphicon glyphicon-triangle-bottom"></span>
                </div>
            </div>
            <h4>Image Capture Run</h4>
        </div>
        <div id="capture-container">
        <div class="flex-container">
            <h5>Logging File Name:</h5>
            <div class="input-group" title="File location for storing the image logs">
                <input id="capture-logging-input" class="form-control text-right"  placeholder=" " type="text">
            </div>
        </div>
        <div class="flex-container">
            <h5>Number of frames:</h5>
            <div class="input-group" title=" ">
                <input id="capture-fnumber-input" class="form-control text-right"  placeholder=" " type="text">
            </div>
        </div>
        <div class="input-group-btn">
            <button id="display-run-button" class="btn btn-default" type="button">Display Capture Run</button>
            <button id="log-run-button" class="btn btn-default" type="button">Log Capture Run</button>
        </div>
        </div>
    </div>
    <div class="child">
        <div class="child-header">
            <div id="calibration-collapse" class="collapse-button">
                <div class="collapse-table">
                    <span id="calibration-button-symbol" class="collapse-cell    glyphicon glyphicon-triangle-bottom"></span>
                </div>
            </div>
            <h4>ASIC Calibration Run</h4>
        </div>
        <div id="calibration-container">
        <div class="flex-container">
            <h5>Logging File Name:</h5>
            <div class="input-group" title="File location for storing the caibration image logs">
                <input id="calibration-logging-input" class="form-control text-right"  placeholder=" " type="text">
            </div>
        </div>
        <div class="flex-container">
            <h5>AUXSAMPLE Start(V):</h5>
            <div class="input-group" title=" ">
                <input id="configure-input-start" min="0" max="3.3" class="form-control text-right" aria-label="Start" placeholder="0" type="number" step="0.01">
            </div>
        </div>
        <div class="flex-container">
            <h5>AUXSAMPLE Step(V):</h5>
            <div class="input-group" title=" ">
                <input id="configure-input-step" min="0" max="3.3" class="form-control text-right" aria-label="Step" placeholder="0.1" type="number" step="0.01">
            </div>
        </div>
        <div class="flex-container">
            <h5>AUXSAMPLE Finish(V):</h5>
            <div class="input-group" title=" ">
                <input id="configure-input-finish" min="0" max="3.3" class="form-control text-right" aria-label="Finish" placeholder="1" type="number" step="0.01">
            </div>
        </div>
        <div class="input-group-btn">
            <button id="calibration-run-button" class="btn btn-default" type="button">Perform Calibration Run</button>
        </div>
        </div>
    </div>
</div>
</div>
`;

       this.mount.appendChild(container);

       document.getElementById("capture-collapse").addEventListener("click", this.toggleCollapsed.bind(this, "capture"));
       document.getElementById("calibration-collapse").addEventListener("click", this.toggleCollapsed.bind(this, "calibration"));

       document.getElementById("display-single-button").addEventListener("click", this.imageGenerate.bind(this));
       document.getElementById("log-run-button").addEventListener("click", this.logImageCapture.bind(this));
       document.getElementById("calibration-run-button").addEventListener("click", this.calibrationImageCapture.bind(this));

       //Update navbar
       var list_elem = document.createElement("li");
       nav_list.appendChild(list_elem);
       var link = document.createElement("a");
       link.href = "#";
       list_elem.appendChild(link);
       var link_text = document.createTextNode("Image Capture");
       link.appendChild(link_text);
       link.addEventListener("click", this.changePage.bind(this, "Capture"));

       //Add frequency overlay
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

App.prototype.generateResistors =
    function (resistors) {
        resistor_table = `
        <table>
            <thead>
              <tr>
                <td></td>
                <th>Resistance</th>
              </tr>
            </thead>
            <tbody>`
        var i;
        for (i=0; i<resistors.length; i++) {
            resistor_table += `
              <tr>
                <th class="text-right">` + resistors[i]["name"] + `</th>
                <td>
                  <div class="input-group">
                    <input class="form-control text-right" id="resistor-`+ i.toString() +`-input" aria-label="Value" placeholder="` + Number(resistors[i]["resistance"]["value"]).toFixed(2).toString() + `" type="text">
                    <div class="input-group-btn">
                      <button class="btn btn-default" id="resistor-`+ i.toString() + `-button" type="button">Set</button>
                    </div>
                  </div>
                </td>
              </tr>`
        }
        resistor_table += `
            </tbody>
        </table>`
        return resistor_table
    };

App.prototype.generateSupplies =
    function (supplies) {
        supply_table = `
        <table>
            <thead>
              <tr>
                <td></td>
                <th>Voltage (V)</th>
                <th>Current (mA)</th>
              </tr>
            </thead>
            <tbody>`
        var i;
        for (i=0; i<supplies.length; i++) {
            supply_table += `
              <tr>
                <th class="text-right">` + supplies[i]["name"] + `</th>
                <td>
                  <span id="supply-voltage-`+ i.toString() + `">` + Number(supplies[i]["voltage"]["value"]).toFixed(3).toString() + `</span>
                </td>
                <td>
                  <span id="supply-current-`+ i.toString() + `">` + Number(supplies[i]["current"]["value"]).toFixed(2).toString() + `</span>
                </td>
              </tr>`
        }
        supply_table += `
            </tbody>
        </table>`
        return supply_table
    };

App.prototype.updateLoop_bp =
    function() {
        var button = document.getElementById('bp-update-button')
        if (button.innerHTML=="Disabled") {
            apiPUT(this.current_adapter, "sensors_enabled", "true");
            this.update_bp();
            button.innerHTML="Updating";
            button.classList.remove("btn-danger");
            button.classList.add("btn-success");
            document.getElementById('bp-refresh-button').disabled = true;
        } else {
            apiPUT(this.current_adapter, "sensors_enabled", "false");
            button.innerHTML="Disabled";
            button.classList.remove("btn-success");
            button.classList.add("btn-danger");
            document.getElementById('bp-refresh-button').disabled = false;
        }
    }

App.prototype.update_bp =
    function() {
        apiPUT(this.current_adapter, "update_required", "true")
        .done(
            (function() {
                apiGET(this.current_adapter, "", false)
                .done(
                    (function(data) {
                        for (i=0; i<data["current_voltage"].length; i++) {
                            document.getElementById('supply-voltage-' + i.toString()).innerHTML = Number(data["current_voltage"][i]["voltage"]).toFixed(3).toString();
                            document.getElementById('supply-current-' + i.toString()).innerHTML = Number(data["current_voltage"][i]["current"]).toFixed(2).toString();
                        }
                        if (data["sensors_enabled"]=="True") {
                            setTimeout(this.update_bp.bind(this), this.update_delay * 1000);
                        }
                    }).bind(this)
                )
                .fail(this.setError.bind(this));
            }).bind(this)
        )
    }

    App.prototype.reload_bp =
        function() {
            apiPUT(this.current_adapter, "reset", "true")
            .done(
                (function() {
                    apiGET(this.current_adapter, "", false)
                    .done(
                        (function(data) {
                            apiPUT(this.current_adapter, "clock", document.getElementById('clock-input').placeholder);
                            for (i=0; i<data["resistors"].length; i++) {
                                document.getElementById('resistor-' + number +  '-input').placeholder=Number(data["resistors"][i]["resistance"]).toFixed(2).toString()
                            };
                            this.update_bp();
                        }).bind(this)
                    )
                    .fail(this.setError.bind(this));
                }).bind(this)
            )
        }


App.prototype.setClock =
    function() {
        var element = document.getElementById('clock-input');
        var value = Number(element.value);
        apiPUT(this.current_adapter, "clock", value)
        .done(
            function() {
                element.placeholder = value.toFixed(1)
                element.value = ""
            }
        )
        .fail(this.setError.bind(this))
    }

App.prototype.setResistor =
    function(number) {
        var element = document.getElementById('resistor-' + number +  '-input');
        var location = "resistors/" + number + "/resistance"
        var value = Number(element.value);
        apiPUT(this.current_adapter, location, value)
        .done(
            function() {
                element.placeholder = value.toFixed(2)
                element.value = ""
            }
        )
        .fail(this.setError.bind(this))
    }

App.prototype.setVolatile =
    function() {
        var button = document.getElementById('resistor-volatile-button')
        if (button.innerHTML=="No") {
            apiPUT(this.current_adapter, "non_volatile", "true");
            this.update_bp();
            button.innerHTML="Yes";
            button.classList.remove("btn-danger");
            button.classList.add("btn-success");
        } else {
            apiPUT(this.current_adapter, "non_volatile", "false");
            button.innerHTML="No";
            button.classList.remove("btn-success");
            button.classList.add("btn-danger");
        }
    }

App.prototype.imageGenerate =
    function() {
        apiPUT(this.current_adapter, "image", 2)
        .done(this.updateImage())
        .fail(this.setError.bind(this));
    }

App.prototype.updateImage =
    function() {
        apiGET(this.current_adapter, "image")
        .done(
            function(imageCount) {
                if (imageCount > 0) {
                    this.updateImage()
                }
            }
        )
        .fail(this.setError.bind(this));
    }

App.prototype.logImageCapture =
    function() {
        var fnumber = Number(document.getElementById('capture-fnumber-input').value)
        var location = String(document.getElementById('capture-logging-input').value)
        apiPUT(this.current_adapter, "capture_run", fnumber.toString() + ";" + location)
    }

App.prototype.calibrationImageCapture =
    function() {
        var location = String(document.getElementById('calibration-logging-input').value)
        var Vstart = Number(document.getElementById('configure-input-start').value).toFixed(2)
        var Vstep = Number(document.getElementById('configure-input-step').value).toFixed(2)
        var Vfinish = Number(document.getElementById('configure-input-finish').value).toFixed(2)
        this.calibrationImageCaptureStep("1000;" + location, Vstart, Vstep, Vfinish)
    }

App.prototype.calibrationImageCaptureStep =
    function(configuration, VStart, VStep, VFinish) {
        parentthis = this;
        apiPUT(parentthis.current_adapter, "resistors/6/resistance", VStart)
        .done(
            (function() {
                setTimeout(function() {
                    apiPUT(parentthis.current_adapter, "capture_run", configuration + "_" + VStart.toString())
                    .done(
                        function() {
                            VStart = (VStart + VStep).toFixed(2);
                            if (VStart <= VFinish) {
                                parentthis.calibrationImageCaptureStep(configuration, VStart, VStep, VFinish);
                            }
                        }
                    )
                    .fail(parentthis.setError.bind(this))
                }, 50);
            })
        )
        .fail(parentthis.setError.bind(this))
    }

App.prototype.changePage =
    function(page) {
        if(page=="Configuration") {
            document.getElementById("configuration-page").classList.add("active");
            document.getElementById("image-capture-page").classList.remove("active");
        } else {
            document.getElementById("configuration-page").classList.remove("active");
            document.getElementById("image-capture-page").classList.add("active");
        }
    };

App.prototype.toggleCollapsed =
    function(section) {
        document.getElementById(section + "-container").classList.toggle("collapsed");
        document.getElementById(section + "-button-symbol").classList.toggle("glyphicon-triangle-right");
        document.getElementById(section + "-button-symbol").classList.toggle("glyphicon-triangle-bottom");
    };


App.prototype.setError =
    function(data) {
        if(data.hasOwnProperty("json")) {
            var json = data.responseJSON;
            if(json.hasOwnProperty("error"))
                this.showError(json.error);
        } else {
            this.showError(data.responseText);
        }
    }

App.prototype.showError =
    function(msg) {
        if(this.error_timeout !== null) clearTimeout(this.error_timeout);
        this.error_message.nodeValue = `Error: ${msg}`;
        this.error_timeout = setTimeout(this.clearError.bind(this), 5000);
    }

App.prototype.clearError =
    function() {
        this.error_message.nodeValue = "";
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
    function() {
        this.dark_mode = !this.dark_mode;
        this.setCookie("dark", this.dark_mode.toString());

        this.mount.classList.toggle("dark");
        this.documentBody.classList.toggle("background-dark");
    };

App.prototype.getCookie =
    function(key)  {
        var raw = document.cookie.split(';');
        for(var value of raw) {
            if(value.indexOf(key) == 0)
                return decodeURIComponent(value.substring(key.length + 1));
        }
    };

App.prototype.setCookie =
    function(key, value) {
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
            if(raw[i].indexOf(key) === 0) {
                raw[i] = cookieString;
                found = true;
            }
        if(!found)
            raw.push(cookieString);
        var s = `${raw.join(';')};${expires};path=/`;
        document.cookie = `${raw.join(';')};${expires};path=/`;
    };

//Create the App() instance
function initApp() {
    var app = new App();
}
