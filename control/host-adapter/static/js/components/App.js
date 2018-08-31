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
        console.log(meta["interface"]);
        if (meta["interface"]["sensors_enabled"]["value"] == "True") {
            this.updateLoop_bp();
        }
        if (meta["interface"]["non_volatile"]["value"] == "True") {
            this.setVolatile();
            //this.setVolatileTrue();
        }
    }).bind(this)
);
}

App.prototype.freq_overlay = null;
App.prototype.update_delay = 0.5;
App.prototype.dark_mode = false;
App.prototype.in_calibration_mode = true 



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
                    <p class="desc">Configuration options for the ASIC and Backplane</p>
                <div class="vertical">
                    <div>
                        <h5>Clock:</h5>
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
                        <h5>Refresh Backplane:</h5>
                        <div class="variable-padding">
                            <div class="padder"></div>
                        </div>
                        <div>
                            <button id="bp-refresh-button" type="button" class="btn btn-default">Update</button>
                        </div>
                    </div>
                    <div>
                        <h5>Backplane Updating:</h5>
                        <div class="variable-padding">
                            <div class="padder"></div>
                        </div>
                        <div>
                            <button id="bp-update-button" type="button" class="btn btn-toggle btn-danger">Disabled</button>
                        </div>
                    </div>
                    <div>
                        <h5>Reload Backplane:</h5>
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
            <div id="ASIC-container" class="flex-container">
                <div id="top-flex" class="flex-item">
                    <div class="child-header">
                        <h4 class="non-drop-header">Mode</h4>
                    </div>
                    <div class='table-container-left'>
            
                        <div id="toggle-container">
                            <div class="inner-toggle-container">
                                <div class="toggle">
                                    <p>Image Capture Mode</p>
                                </div>
                                <div class="toggle">
                                    <p>Calibration Mode</p>
                                </div>
                            </div>

                            <div class="inner-toggle-container" id="inner-toggle-container">
                                <div class="toggle">
                                    <p>Image Capture Mode</p>
                                </div>
                                <div class="toggle">
                                    <p>Calibration Mode</p>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>

                <div id="top-flex" class="flex-item">
                    <div class="child-header">
                        <h4>Configuration</h4>
                    </div>
                    <div class="table-container">
                       
                        <div class="dropdown-file">
                            <button id="toggle-btn" class="btn btn-primary dropdown-toggle" type="button" data-toggle="dropdown" aria-expanded="false">Configuration Vector File
                            <span class="caret"></span></button>
                            <ul class="dropdown-menu" id="file_list">` 
                            + this.generateImageVectorFiles(data["image_vector_files"]["value"]) + this.generateADCVectorFiles(data["adc_vector_files"]["value"]) + 
                            `</ul>
                        </div>
                        <span id="current-txt-file"></span>
                    </div>
                </div>
            </div>
        </div>


        <div class="child">
            <div class="child-header">
                <div id="BIAS-collapse" class="collapse-button">
                    <div class="collapse-table">
                        <span id="BIAS-button-symbol" class="collapse-cell    glyphicon glyphicon-triangle-bottom"></span>
                    </div>
                </div>
                <h4>BIAS Settings</h4>
            </div>
            <div id="BIAS-container" class="flex-container">
            <div class="flex-item">
                <div class="table-container-left">
                    <table>
                        <thead>
                            <tr>
                                <th></th>
                                <th>Value</th>
                                <th></th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <th class="text-right">iBiasCol</th>
                                <td>
                                    <div class="input-group">
                                        <input class="form-control text-right" id="DAC-0-input" aria-label="Value" placeholder="010100" type="text">
                                    </div>
                                </td>
                                <th class="text-right">iBiasSF0</th>
                                <td>
                                    <div class="input-group">
                                        <input class="form-control text-right" id="DAC-1-input" aria-label="Value" placeholder="001100" type="text">
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th class="text-right">vBiasPGA</th>
                                <td>
                                    <div class="input-group">
                                        <input class="form-control text-right" id="DAC-2-input" aria-label="Value" placeholder="101101" type="text">
                                    </div>
                                </td>
                                <th class="text-right">iBiasPGA</th>
                                <td>
                                    <div class="input-group">
                                        <input class="form-control text-right" id="DAC-3-input" aria-label="Value" placeholder="001100" type="text">
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th class="text-right">iBiasSF1</th>
                                <td>
                                    <div class="input-group">
                                        <input class="form-control text-right" id="DAC-4-input"  aria-label="Value" placeholder="010000" type="text">
                                    </div>
                                </td>
                                <th class="text-right">iBiasOutSF</th>
                                <td>
                                    <div class="input-group">
                                        <input class="form-control text-right" id="DAC-5-input" aria-label="Value" placeholder="001010" type="text">
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th class="text-right">iBiasLoad</th>
                                <td>
                                    <div class="input-group">
                                        <input class="form-control text-right" id="DAC-6-input" aria-label="Value" placeholder="010100" type="text">
                                    </div>
                                </td>
                                <th class="text-right">iBiasADCbuffer</th>
                                <td>
                                    <div class="input-group">
                                        <input class="form-control text-right" id="DAC-7-input" aria-label="Value" placeholder="011001" type="text">
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th class="text-right">iBiasCalC</th>
                                <td>
                                    <div class="input-group">
                                        <input class="form-control text-right" id="DAC-8-input" aria-label="Value" placeholder="010100" type="text">
                                    </div>
                                </td>
                                <th class="text-right">iBiasRef</th>
                                <td>
                                    <div class="input-group">
                                        <input class="form-control text-right" id="DAC-9-input" aria-label="Value" placeholder="001010" type="text">
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th class="text-right">iCbiasP</th>
                                <td>
                                    <div class="input-group">
                                        <input class="form-control text-right" id="DAC-10-input" aria-label="Value" placeholder="010010" type="text">
                                    </div>
                                </td>
                                <th class="text-right">vBiasCasc</th>
                                <td>
                                    <div class="input-group">
                                        <input class="form-control text-right" id="DAC-11-input" aria-label="Value" placeholder="001100" type="text">
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th class="text-right">iFbiasN</th>
                                <td>
                                    <div class="input-group">
                                        <input class="form-control text-right" id="DAC-12-input" aria-label="Value" placeholder="011000" type="text">
                                    </div>
                                </td>
                                <th class="text-right">iBiasCalF</th>
                                <td>
                                    <div class="input-group">
                                        <input class="form-control text-right" id="DAC-13-input" aria-label="Value" placeholder="000000" type="text">
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th class="text-right">iBiasADC1</th>
                                <td>
                                    <div class="input-group">
                                        <input class="form-control text-right" id="DAC-14-input" aria-label="Value" placeholder="100000" type="text">
                                    </div>
                                </td>
                                <th class="text-right">iBiasADC2</th>
                                <td>
                                    <div class="input-group">
                                        <input class="form-control text-right" id="DAC-15-input" aria-label="Value" placeholder="000101" type="text">
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th class="text-right">iBiasAmpLVDS</th>
                                <td>
                                    <div class="input-group">
                                        <input class="form-control text-right" id="DAC-16-input" aria-label="Value" placeholder="011010" type="text">
                                    </div>
                                </td>
                                <th class="text-right">iBiasLVDS</th>
                                <td>
                                    <div class="input-group">
                                        <input class="form-control text-right" id="DAC-17-input" aria-label="Value" placeholder="001100" type="text">
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th class="text-right">iBiasPLL</th>
                                <td>
                                    <div class="input-group">
                                        <input class="form-control text-right" id="DAC-18-input" aria-label="Value" placeholder="001010" type="text">
                                    </div>
                                </td>
                                <th></th>
                                <th></th>
                            </tr>
                        </tbody>
                    </table>
                </div>
                </div>
                <div class="flex-item">
                <div class="table-container">

                    <div class="flex-item">
                        <button id="save-as-vector-file-button" class="btn btn-default" type="button">Save as Vector File</button>
                    </div>
                    <div class="flex-item">
                        <button id="upload-vector-file-button" class="btn btn-default" type="button">Upload Vector File </button>
                    </div>

                </div>
                </div>
                
            </div>
        </div>

        <div class="child">

            <div class="child-header">
                <div id="camera-collapse" class="collapse-button">
                    <div class="collapse-table">
                        <span id="camera-button-symbol" class="collapse-cell    glyphicon glyphicon-triangle-bottom"></span>
                    </div>
                </div>
                <h4>Camera</h4>
            </div>

            <div id="camera-container" class="flex-container">
           
            
                <div id="variable-supply-container" class="flex-item">
                    <div class="child-header-2">
                        <h4 class="non-drop-header">Settings</h4>
                    </div>
                    <div class="table-container-left">` + this.generateResistors(data["resistors"]) + `

                        <div class='well'>Save value as new default on set

                            <div class="btn-group">
                                <button id="save-default-button" type="button" class="btn btn-danger btn-block">OFF</button>
                            </div>
                   
                        </div>

                        <button id="load-default-button" type="button" class="btn btn-primary">Load Default Values</button>
                      
                    </div>

                </div>
            
                <div id="static-supply-container" class="flex-item">
                    <div class="child-header-2">
                        <h4>Monitoring</h4>
                    </div>
                    <div class="table-container">` + this.generateSupplies(data["current_voltage"]) + `
                    </div>
                </div>

            </div>
        </div>
        <div class="child">
            <div class="child-header">
                <div id="operating-collapse" class="collapse-button">
                    <div class="collapse-table">
                        <span id="operating-button-symbol" class="collapse-cell    glyphicon glyphicon-triangle-bottom"></span>
                    </div>
                </div>
                <h4>Operating</h4>
            </div>
                <div id="operating-container" class="flex-container">
                    <div id="adc-calibration-container" class="flex-item">
                        <div class="child-header-2">
                            <h4 class="non-drop-header">ADC Calibration</h4>
                        </div>
                        <div class='table-container-left' id='adc-table'>
                            <div class="btn-group">
                                <button id="fine-calibrate-button" type="button" class="btn btn-default">Calibrate Fine</button>
                                <button id="coarse-calibrate-button" type="button" class="btn btn-default">Calibrate Coarse</button>
                            </div>
                            <div class="input-group" id='adc-input'>
                                <input class="form-control text-right" id="frames-value" placeholder="1" type="text">
                                <span id='frames-addon' class="input-group-addon">Frames</span>
                                <input class="form-control text-right" id="delay-value" placeholder="0" type="text">
                                <span class="input-group-addon">Delay</span>
                            </div>
                            <div class='row'>
                                <div id='coarse_div' class='column'> ` + this.generateCoarseGraph() + ` </div>
                                <div id='fine_div' class='column'> ` + this.generateFineGraph() + `</div>
                            </div>
                        </div>
                    </div>
          

                </div>
                      




        </div>



    </div>
</div>
`;

       this.mount.appendChild(container);
        
       //document.getElementById("ASIC-collapse").addEventListener("click", this.toggleCollapsed.bind(this, "ASIC"));
       document.getElementById("BIAS-collapse").addEventListener("click", this.toggleCollapsed.bind(this, "BIAS"));
       document.getElementById("camera-collapse").addEventListener("click", this.toggleCollapsed.bind(this, "camera"));
       document.getElementById("operating-collapse").addEventListener("click", this.toggleCollapsed.bind(this, "operating"));

       document.getElementById('clock-button').addEventListener("click", this.setClock.bind(this));
       document.getElementById('bp-refresh-button').addEventListener("click", this.update_bp.bind(this));
       document.getElementById('bp-update-button').addEventListener("click", this.updateLoop_bp.bind(this));
       document.getElementById('bp-reload-button').addEventListener("click", this.reload_bp.bind(this));

       for (i=0; i<data["resistors"].length; i++) {
           document.getElementById("resistor-" + i.toString() + "-button").addEventListener("click", this.setResistor.bind(this, i.toString()));
       };

       document.getElementById('save-default-button').addEventListener("click", this.setVolatile.bind(this));

       document.getElementById('save-as-vector-file-button').addEventListener("click", this.saveAsVector.bind(this));
       document.getElementById('upload-vector-file-button').addEventListener("click", this.uploadVectorPress.bind(this));
       document.getElementById('fine-calibrate-button').addEventListener("click", this.calibrateFine.bind(this));
       document.getElementById('coarse-calibrate-button').addEventListener("click", this.calibrateCoarse.bind(this));
       //document.getElementById('save-images-button').addEventListener("click", this.saveImages)


       var mode_toggle = document.getElementById('toggle-container');
       var image_vector_files = document.getElementsByClassName("image_vectors")
       var adc_vector_files = document.getElementsByClassName("adc_vectors")
       var mode_toggleContainer = document.getElementById('inner-toggle-container');
       var mode_toggleNumber;
       
       mode_toggle.addEventListener('click', function() {
        mode_toggleNumber = !mode_toggleNumber;
           if (mode_toggleNumber) {
                this.in_calibration_mode = false;
                for(var i=0; i<image_vector_files.length;i++){
                    image_vector_files[i].style.display = 'block';
                }
                for(var i=0; i<adc_vector_files.length;i++){
                    adc_vector_files[i].style.display = 'none';
                }
                console.log("in image capture mode")
                mode_toggleContainer.style.clipPath = 'inset(0 0 0 50%)';
                mode_toggleContainer.style.backgroundColor = '#337ab7';
                //document.getElementById('adc-calibration-container').classList.add("hidden")
                //document.getElementById('save-image-container').classList.remove("hidden")

           } else {
                this.in_calibration_mode = true;   
                
                for(var i=0; i<image_vector_files.length;i++){
                    image_vector_files[i].style.display = 'none';
                }
                for(var i=0; i<adc_vector_files.length;i++){
                    adc_vector_files[i].style.display = 'block';
                }
                console.log("in calibration mode")
                mode_toggleContainer.style.clipPath = 'inset(0 50% 0 0)';
                mode_toggleContainer.style.backgroundColor = '#337ab7';
                //document.getElementById('adc-calibration-container').classList.remove("hidden")
                //document.getElementById('save-image-container').classList.add("hidden")

           }
       });

       var vector_list = document.getElementById("file_list");

       for(var i=0; i< vector_list.children.length; i++){
            vector_list.children[i].addEventListener("click", this.setVectorFile.bind(this));
       }
       


       
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
                            <img id="image_display" src="img/black_img.png">
                        </div>
                    </div>

                    <div class='table-container-left'>
                        <div class="flex-item">
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
                    <div class = "flex-container" id="capture-container">
                        <div class="flex-item">
                            <div class = 'table-container-left'>

                                <div class='flex-item'>
                                    <div class='input-group input-single'>
                                        <input class="form-control text-right" id="capture-logging-input" placeholder="/scratch/qem/" type="text">
                                        <span id='log-file-span' class="input-group-addon addon-single"> Log Filename  </span>
                                    </div>
                                </div>

                                <div class ='flex-item'>
                                    <div class='input-group input-single'>
                                        <input class="form-control text-right" id="capture-fnumber-input" placeholder="1000" type="text">
                                        <span id='frame-num-span' class="input-group-addon addon-single">Frame Number</span>
                                    </div>
                                </div>

                                <div class='flex-item'>
                                    <button id="display-run-button" class="btn btn-default" type="button">Display Image Run</button>
                                    <button id="log-run-button" class="btn btn-default" type="button">Log Image Run</button>
                                </div>
                                
                            </div>
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
                    <div class='flex-container' id="calibration-container">
                    <div class="flex-item">
                        <div class='table-container-left'>

                            <div class='flex-item'>
                                <div class='input-group input-single'>
                                    <input id="calibration-logging-input" class="form-control text-right"  placeholder=" " type="text">
                                    <span id='calibration-log-span' class="input-group-addon addon-single">Calibration Log Filename</span>
                                </div>
                            </div>
                            <div class='flex-item'>
                                <div class='input-group input-single'>
                                    <input id="configure-input-start" min="0" max="3.3" class="form-control text-right" aria-label="Start" placeholder="0" type="number" step="0.01">
                                    <span id='auxsample-start-span' class="input-group-addon addon-single">Aux Sample Start (V)</span>
                                </div>
                            </div>

                            <div class='flex-item'>
                                <div class='input-group input-single'>
                                    <input id="configure-input-step" min="0" max="3.3" class="form-control text-right" aria-label="Step" placeholder="0.1" type="number" step="0.01">
                                    <span id='auxsample-step-span' class="input-group-addon addon-single">Aux Sample Step (V)</span>
                                </div>
                            </div>

                            <div class='flex-item'>
                                <div class='input-group input-single'>
                                    <input id="configure-input-finish" min="0" max="3.3" class="form-control text-right" aria-label="Finish" placeholder="1" type="number" step="0.01">
                                    <span id='auxsample-finish-span' class="input-group-addon addon-single">Aux Sample Finish (V)</span>
                                </div>
                            </div>

                            <div class="flex-item">
                                <button id="calibration-run-button" class="btn btn-default" type="button">Perform Calibration Run</button>
                            </div>
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

       //add file overlay
       this.file_overlay = document.createElement("div");
       this.file_overlay.classList.add("overlay-background");
       this.file_overlay.classList.add("hidden");
       this.file_overlay.innerHTML = `
            <div class="overlay-freq_file">
            <h5>Save the current bias settings to a new vector file</h5>
            <div>
                <div class="input-group">
                    <input class="form-control text-right" id="file-value" placeholder="" type="text">
                    <span class="input-group-addon">Filename</span>
                </div>
            <div class="overlay-control-buttons">
                    <button class="btn btn-success" id="file-save" type="button">Save</button>
                    <button class="btn btn-danger" id="file-cancel" type="button">Cancel</button>
                </div>
            <div>
            </div>
            `;

       this.mount.appendChild(this.file_overlay);
       document.getElementById("file-cancel").addEventListener("click", this.fileCancel.bind(this));
       document.getElementById("file-save").addEventListener("click", this.createVectorFile.bind(this));

       //Add frequency overlay
       this.freq_overlay = document.createElement("div");
       this.freq_overlay.classList.add("overlay-background");
       this.freq_overlay.classList.add("hidden");
       this.freq_overlay.innerHTML = `
            <div class="overlay-freq_file">
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

        //Add frequency overlay
        this.fpga_warn = document.createElement("div");
        this.fpga_warn.classList.add("overlay-background");
        this.fpga_warn.classList.add("hidden");
        this.fpga_warn.innerHTML = `
            <div class="overlay-fpga_warn">
            <h5>Warning:</h5>
            <div>
                <div>
                    <span id = "fpga-warning">You must re-program the FPGA before loading the new vector file</span>
                </div>
                <div class="overlay-control-buttons" id="fpga-warn-buttons">
                    <button class="btn btn-success" id="upload-vector-final" type="button">I've re-programmed the FPGA, upload</button>
                    <button class="btn btn-danger" id="upload-cancel" type="button">Cancel</button>
                </div>
            </div>
            </div>
            `;

        this.mount.appendChild(this.fpga_warn);
        document.getElementById("upload-cancel").addEventListener("click", this.uploadCancel.bind(this));
        document.getElementById("upload-vector-final").addEventListener("click", this.uploadVector.bind(this));


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


App.prototype.sleep = 
    function(millisec){
        var start = new Date().getTime();
        for (var i = 0; i < 1e7; i++) {
          if ((new Date().getTime() - start) > millisec){
            break;
          }
        }
    }

App.prototype.generateCoarseGraph = 
    function(){
        apiGET(this.current_adapter, "coarse_graph")
        return "<img id='coarse_graph' class='graph' src='img/coarse_graph.png'>"
        
    }

App.prototype.generateFineGraph =
    function(){
        apiGET(this.current_adapter,"fine_graph")
        return "<img id='fine_graph' class='graph' src='img/fine_graph.png'>"

    }
//Handles onClick events from the navbar
App.prototype.calibrateCoarse = 
    function(){

        document.getElementById("fine-calibrate-button").classList.add("btn-default");
        document.getElementById("fine-calibrate-button").classList.remove("btn-success");
        document.getElementById("coarse-calibrate-button").classList.add("btn-success");
        document.getElementById("coarse-calibrate-button").classList.remove("btn-default");

        var frames = document.getElementById('frames-value').value
        if(frames == ""){
            frames = document.getElementById('frames-value').placeholder
        }
        var delay = document.getElementById('delay-value').value
        if(delay == ""){
            delay = document.getElementById('delay-value').placeholder
        }

        apiPUT(this.current_adapter, 'adc_delay', Number(delay))
        .done(
            apiPUT(this.current_adapter, 'adc_frames', Number(frames))
        )
        .done(
            apiPUT(this.current_adapter, 'adc_calibrate_coarse', "true")
        ).done(
            (function(){
                this.sleep(1000)
                document.getElementById("coarse-calibrate-button").classList.remove("btn-success")
                document.getElementById("coarse-calibrate-button").classList.add("btn-default")

                var status = apiGET(this.current_adapter, "coarse_complete")
                while ( status == false){
                    status = apiGET(this.current_adapter, "coarse_complete")
                }

                //document.getElementById('coarse_div').innerHTML = ""
                document.getElementById('coarse_div').innerHTML = this.generateCoarseGraph()
                document.getElementById('coarse_graph').src = "img/coarse_graph.png?" + new Date().getTime()

            }).bind(this)
        )
    }

App.prototype.calibrateFine = 
    function () {

        document.getElementById("fine-calibrate-button").classList.add("btn-success");
        document.getElementById("fine-calibrate-button").classList.remove("btn-default");
        document.getElementById("coarse-calibrate-button").classList.add("btn-default");
        document.getElementById("coarse-calibrate-button").classList.remove("btn-success");

        var frames = document.getElementById('frames-value').value
        if(frames == ""){
            frames = document.getElementById('frames-value').placeholder
        }
        var delay = document.getElementById('delay-value').value
        if(delay == ""){
            delay = document.getElementById('delay-value').placeholder
        }
        apiPUT(this.current_adapter, 'adc_delay', Number(delay))
        .done(
            apiPUT(this.current_adapter, 'adc_frames', Number(frames))
        )
        .done(
            apiPUT(this.current_adapter, 'adc_calibrate_fine', "true")
        ).done(
            
            (function(){
                this.sleep(1000)

                document.getElementById("fine-calibrate-button").classList.remove("btn-success")
                document.getElementById("fine-calibrate-button").classList.add("btn-default")

                var status = apiGET(this.current_adapter, "fine_complete")
                while ( status == false){
                    status = apiGET(this.current_adapter, "fine_complete")
                }

                //document.getElementById('fine_div').innerHTML = ""
                document.getElementById('fine_div').innerHTML = this.generateFineGraph()
                document.getElementById('fine_graph').src = "img/fine_graph.png?" + new Date().getTime()

                

            }).bind(this)
        )


    }


App.prototype.generateResistors =
    function (resistors) {
        resistor_table = `
        <table>
            <thead>
              <tr>
                <th></th>
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
                    <span class="input-group-addon">` 
                    
                    var str = resistors[i]["resistance"]["units"]
                    if (str.length == 1) {
                        str += "  "
                    }
                    resistor_table += str +`</span>
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
                <th></th>
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
                    //console.log(data)
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


    App.prototype.uploadVectorPress = 
        function(){
            this.fpga_warn.classList.remove("hidden");
    }

    App.prototype.uploadCancel = 
        function(){
            this.fpga_warn.classList.add("hidden");
        
        }

    App.prototype.saveAsVector = 
        function(){
            document.getElementById("file-value").placeholder = "QEM_D4_198_ADC_10_icbias1_ifbias1";
            this.file_overlay.classList.remove("hidden");

        }

    App.prototype.fileCancel = 
        function(){
            document.getElementById("file-value").value = "";
            this.file_overlay.classList.add("hidden");
        }

    // this function actually creates the vector file from the bias values 
    App.prototype.createVectorFile = 
        function(){
            var filename = document.getElementById("file-value").value;
            console.log(filename)
            apiPUT(this.current_adapter, "update_bias", "false")
            .done(
                (function(){
                    apiPUT(this.current_adapter, "vector_file", filename)
                    .done(
                        (function(){
                            for(i=0; i < 19; i++){
                                var value = document.getElementById("DAC-"+ i.toString() + "-input").value;
                                apiPUT(this.current_adapter, "dacs/" + i.toString() + "/value", value.toString())
                                
                            }
                        }).bind(this)
                    )
                }).bind(this)
                


            )
            document.getElementById("file-value").value = "";
            this.file_overlay.classList.add("hidden");
        }

    App.prototype.uploadVector = 
        function(){

            apiPUT(this.current_adapter, "upload_vector_file", "true")
            .done(
                (function(){
                    this.fpga_warn.classList.add("hidden");
                }).bind(this)
            )
        }


    App.prototype.generateImageVectorFiles =
        function(image_files){
            var image_list = '';
            var i;
            for (i=0; i<image_files.length; i++) {
                image_list += '<li id="image_files" class="image_vectors"><a href="#">' + image_files[i] + '</a></li>';
            }
            return image_list
        };

    App.prototype.generateADCVectorFiles =
        function(image_files){
            var image_list ='';
            var i;
            for (i=0; i<image_files.length; i++) {
                image_list += '<li class="adc_vectors"><a href="#">' + image_files[i] + '</a></li>';
            }
            return image_list
        }; 


    // replaced number with i
    App.prototype.reload_bp =
        function() {
            apiPUT(this.current_adapter, "reset", "true")
            .done(
                (function() {
                    apiGET(this.current_adapter, "", false)
                    .done(
                        //console.log(data)
                        (function(data) {
                            apiPUT(this.current_adapter, "clock", parseFloat(document.getElementById('clock-input').placeholder));
                            for (i=0; i<data["resistors"].length; i++) {
                                document.getElementById('resistor-' + i +  '-input').placeholder=Number(data["resistors"][i]["resistance"]).toFixed(2).toString()
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


App.prototype.setVectorFile = 
    function(event){

        var element = event.target
        var value = element.innerHTML

        document.getElementById("current-txt-file").innerHTML = value

        apiPUT(this.current_adapter, "update_bias", "true")
        .done(
            apiPUT(this.current_adapter, "vector_file", value)
            .done(
                
                apiGET(this.current_adapter, "", false)
                .done(
                    function(data){
                        for(i=0; i< data["dacs"].length; i++){
                            //console.log(i.toString())
                            document.getElementById('DAC-' + i.toString() + '-input').value = data["dacs"][i]["value"];
                        }

                    }
                )
            )
            .fail(this.setError.bind(this))
        ).fail(this.setError.bind(this))
    };

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
        var button = document.getElementById('save-default-button')
        if (button.innerHTML=="OFF") {
            apiPUT(this.current_adapter, "non_volatile", "true");
            this.update_bp();
            button.innerHTML="ON";
            button.classList.remove("btn-danger");
            button.classList.add("btn-success");
        } else {
            apiPUT(this.current_adapter, "non_volatile", "false");
            button.innerHTML="OFF";
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

        document.getElementById("log-run-button").classList.add("btn-success");
        document.getElementById("log-run-button").classList.remove("btn-default");

        document.getElementById("display-run-button").classList.add("btn-default");
        document.getElementById("display-run-button").classList.remove("btn-sucess");

        var fnumber = Number(document.getElementById('capture-fnumber-input').value)
        if (fnumber == ""){
            fnumber = Number(document.getElementById('capture-fnumber-input').placeholder)
        }
        var location = String(document.getElementById('capture-logging-input').value)
        if (location == ""){
            var d = new Date()
            var date = d.getDay() + "-" + d.getMonth() + "-" + d.getFullYear()
            location = String(document.getElementById('capture-logging-input').placeholder) + date
        }

        apiPUT(this.current_adapter, "capture_run", fnumber.toString() + ";" + location)
        .done(
            (
                function(){
                    this.sleep(1000)
                    document.getElementById("log-run-button").classList.remove("btn-success");
                    document.getElementById("log-run-button").classList.add("btn-default");
                }
            ).bind(this)
        )
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

