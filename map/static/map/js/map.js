document.addEventListener("DOMContentLoaded", () => {
  const WFS_BASE = "http://localhost:9090/geoserver/pune_workspace/ows";
  const TALUKA_TYPENAME = "pune_workspace:taluka_boundary";
  const VILLAGE_TYPENAME = "pune_workspace:village_boundary";
  const HEALTHCARE_TYPENAME = "pune_workspace:healthcare-pune";

  let draw;
  let currentFeature;
  let measureTooltipElement;
  let measureTooltip;
  const cropDetailsModal = new bootstrap.Modal(
    document.getElementById("cropDetailsModal")
  );

  const talukaSelect = document.getElementById("taluka");
  const villageSelect = document.getElementById("village");
  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const searchResultsDiv = document.getElementById("searchResults");
  const popupContainer = document.getElementById("popup");
  const popupContent = document.getElementById("popup-content");
  const popupCloser = document.getElementById("popup-closer");
  const measureDistBtn = document.getElementById("measureDistBtn");
  const measureAreaBtn = document.getElementById("measureAreaBtn");
  const drawPolyBtn = document.getElementById("drawPolyBtn");

  const clearDrawingsBtn = document.getElementById("clearDrawingsBtn");
  const saveCropDetailsBtn = document.getElementById("saveCropDetailsBtn");
  const discardPolygonBtn = document.getElementById("discardPolygonBtn");

  const cropSeasonSelect = document.getElementById("cropSeason");
  const cropTypeSelect = document.getElementById("cropType");
  const specificCropSelect = document.getElementById("specificCrop");
  const cropTypeGroup = document.getElementById("cropTypeGroup");
  const specificCropGroup = document.getElementById("specificCropGroup");

  const CROP_DATA = {
    Kharif: {
      Cereals: ["Jowar (Sorghum)", "Bajra (Pearl millet)", "Maize"],
      Pulses: ["Tur (Pigeon pea)", "Moong (Green gram)", "Udid (Black gram)"],
      Oilseeds: ["Groundnut", "Soybean", "Sunflower"],
      Commercial: ["Cotton", "Sugarcane"],
      Vegetables: [
        "Bhendi (Okra)",
        "Brinjal",
        "Tomato",
        "Chillies",
        "Cucurbits",
      ],
    },
    Rabi: {
      Cereals: ["Wheat", "Barley", "Jowar (Rabi type)"],
      Pulses: ["Gram (Chana)", "Lentil", "Peas"],
      Oilseeds: ["Safflower", "Mustard"],
      Vegetables: [
        "Onion",
        "Garlic",
        "Cabbage",
        "Cauliflower",
        "Carrot",
        "Tomato",
      ],
    },
    Zaid: {
      "Fruits/Vegetables": ["Watermelon", "Muskmelon", "Cucumber", "Gourds"],
      Commercial: ["Summer Maize", "Sunflower"],
    },
    Horticulture: {
      Fruits: ["Mango", "Pomegranate", "Banana", "Guava", "Papaya"],
      Flowers: ["Marigold", "Rose", "Chrysanthemum"],
      Spices: ["Turmeric", "Ginger", "Garlic"],
    },
  };

  const CROP_TYPE_COLORS = {
    Cereals: "#a2d2ff", // Light blue
    Pulses: "#bde0fe", // Lighter blue
    Oilseeds: "#ffafcc", // Light pink
    Commercial: "#ffc8dd", // Lighter pink
    Vegetables: "#cdb4db", // Lavender
    "Fruits/Vegetables": "#ffeedd", // Off-white/cream (Zaid)
    Fruits: "#dda15e", // Earthy orange (Horticulture)
    Flowers: "#b8c9d1", // Grayish blue
    Spices: "#efc39d", // Light brown
    Default: "#d4d4d4", // Fallback color (light grey)
  };

  const initialCenter = ol.proj.fromLonLat([73.8567, 18.5204]);
  const initialZoom = 9;

  const talukaStyle = new ol.style.Style({
    fill: new ol.style.Fill({ color: "rgba(0, 0, 255, 0.3)" }),
    stroke: new ol.style.Stroke({ color: "#000080", width: 2 }),
  });
  const villageStyle = new ol.style.Style({
    fill: new ol.style.Fill({ color: "rgba(255, 0, 0, 0.2)" }),
    stroke: new ol.style.Stroke({ color: "#800000", width: 1 }),
  });
  const selectedVillageStyle = new ol.style.Style({
    fill: new ol.style.Fill({ color: "rgba(255, 0, 0, 0.5)" }),
    stroke: new ol.style.Stroke({ color: "#800000", width: 2.5 }),
  });
  const healthcareStyle = new ol.style.Style({
    image: new ol.style.Circle({
      radius: 7,
      fill: new ol.style.Fill({ color: "rgba(30, 190, 30, 0.7)" }),
      stroke: new ol.style.Stroke({ color: "white", width: 1.5 }),
    }),
  });
  const searchHighlightStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({ color: "rgba(255, 165, 0, 0.9)", width: 3 }),
    fill: new ol.style.Fill({ color: "rgba(255, 165, 0, 0.3)" }),
    image: new ol.style.Circle({
      radius: 9,
      fill: new ol.style.Fill({ color: "rgba(255, 165, 0, 0.5)" }),
      stroke: new ol.style.Stroke({
        color: "rgba(255, 165, 0, 0.9)",
        width: 2,
      }),
    }),
  });
  const measureStyle = new ol.style.Style({
    fill: new ol.style.Fill({ color: "rgba(255, 204, 51, 0.3)" }),
    stroke: new ol.style.Stroke({ color: "#ffcc33", width: 2 }),
    image: new ol.style.Circle({
      radius: 5,
      stroke: new ol.style.Stroke({ color: "#ffcc33" }),
      fill: new ol.style.Fill({ color: "rgba(255, 204, 51, 0.3)" }),
    }),
  });

  // --- Vector Sources & Layers ---
  const talukaSource = new ol.source.Vector();
  const villageSource = new ol.source.Vector();
  const selectedVillageSource = new ol.source.Vector();
  const healthcareSource = new ol.source.Vector();
  const searchHighlightSource = new ol.source.Vector();
  const userDrawnSource = new ol.source.Vector();
  const measureSource = new ol.source.Vector();

  const osmBaseLayer = new ol.layer.Tile({
    title: "OpenStreetMap",
    type: "base",
    source: new ol.source.OSM(),
    visible: true,
  });
  const esriSatelliteLayer = new ol.layer.Tile({
    title: "Satellite (Esri)",
    type: "base",
    visible: false,
    source: new ol.source.XYZ({
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      maxZoom: 19,
      attributions: "Tiles © Esri",
    }),
  });

  const talukaLayer = new ol.layer.Vector({
    title: "Taluka Boundaries",
    source: talukaSource,
    style: talukaStyle,
  });
  const villageLayer = new ol.layer.Vector({
    title: "Villages (in Taluka)",
    source: villageSource,
    style: villageStyle,
  });
  const selectedVillageLayer = new ol.layer.Vector({
    title: "Selected Village",
    source: selectedVillageSource,
    style: selectedVillageStyle,
    zIndex: 1,
  });
  const healthcareLayer = new ol.layer.Vector({
    title: "Healthcare Facilities",
    source: healthcareSource,
    style: healthcareStyle,
    minZoom: 8,
  });
  const searchHighlightLayer = new ol.layer.Vector({
    title: "Search Highlight",
    source: searchHighlightSource,
    style: searchHighlightStyle,
    zIndex: 2,
  });
  const userDrawnLayer = new ol.layer.Vector({
    title: "Drawn Polygons",
    source: userDrawnSource,
    zIndex: 3,
  });
  const measureLayer = new ol.layer.Vector({
    title: "Measurements",
    source: measureSource,
    style: measureStyle,
    zIndex: 4,
  });

  const map = new ol.Map({
    target: "map",
    layers: [
      new ol.layer.Group({
        title: "Base Maps",
        layers: [osmBaseLayer, esriSatelliteLayer],
      }),
      new ol.layer.Group({
        title: "Overlays",
        layers: [
          talukaLayer,
          villageLayer,
          selectedVillageLayer,
          healthcareLayer,
          searchHighlightLayer,
          userDrawnLayer,
          measureLayer,
        ],
      }),
    ],
    view: new ol.View({
      center: initialCenter,
      zoom: initialZoom,
      projection: "EPSG:3857",
    }),
  });

  // ---- Layer Switcher ----
  if (typeof LayerSwitcher !== "undefined") {
    const layerSwitcher = new LayerSwitcher({
      reverse: true,
      groupSelectStyle: "children",
      tipLabel: "Layers",
    });
    map.addControl(layerSwitcher);
  } else {
    console.error("LayerSwitcher library not loaded.");
  }

  // ---- Popup Overlay ----
  const popupOverlay = new ol.Overlay({
    element: popupContainer,
    autoPan: { animation: { duration: 250 } },
  });
  map.addOverlay(popupOverlay);
  popupCloser.onclick = function () {
    popupOverlay.setPosition(undefined);
    popupCloser.blur();
    return false;
  };

  map.on("singleclick", function (evt) {
    if (draw) return;
    popupOverlay.setPosition(undefined);

    let content = "";
    let featureFound = false;
    const coordinate = evt.coordinate;

    map.forEachFeatureAtPixel(
      evt.pixel,
      function (feature, layer) {
        if (featureFound) return;
        const props = feature.getProperties();
        let title = "";
        let html = "<table>";
        const unknown = '<em style="color:#999;">N/A</em>';

        if (layer === userDrawnLayer) {
          title = "Drawn Polygon Info";
          const area = props.area || formatArea(feature.getGeometry());
          html += `<tr><th>Area:</th><td>${area}</td></tr>`;
          html += `<tr><th>Crop:</th><td>${props.crop_name || "N/A"}</td></tr>`;
          html += `<tr><th>Crop Type:</th><td>${
            props.crop_type || "N/A"
          }</td></tr>`;
          html += `<tr><th>Sown On:</th><td>${
            props.sowing_date || "N/A"
          }</td></tr>`;
          html += `<tr><th>Notes:</th><td>${
            props.notes || "No notes added."
          }</td></tr>`;
          featureFound = true;
        } else if (layer === selectedVillageLayer) {
          title = "Selected Village";
          html += `<tr><th>Name:</th><td>${props.name || unknown}</td></tr>`;
          html += `<tr><th>Taluka:</th><td>${
            props.t_name || talukaSelect.value || unknown
          }</td></tr>`;
          featureFound = true;
        } else if (layer === healthcareLayer) {
          title = "Healthcare Facility";
          html += `<tr><th>Name:</th><td>${
            props.name || props.FAC_NAME || props.facility_name || unknown
          }</td></tr>`;
          html += `<tr><th>Type:</th><td>${
            props.TYPE || props.amenity || props.CATEGORY || unknown
          }</td></tr>`;
          html += `<tr><th>Address:</th><td>${
            props.ADDRESS || props.LOCATION || unknown
          }</td></tr>`;
          featureFound = true;
        } else if (layer === villageLayer) {
          title = "Village";
          html += `<tr><th>Name:</th><td>${props.name || unknown}</td></tr>`;
          html += `<tr><th>Taluka:</th><td>${
            props.t_name || talukaSelect.value || unknown
          }</td></tr>`;
          featureFound = true;
        } else if (layer === talukaLayer) {
          title = "Taluka";
          html += `<tr><th>Name:</th><td>${
            props.thname11 || unknown
          }</td></tr>`;
          featureFound = true;
        }

        if (title) {
          html += "</table>";
          content = `<h5>${title}</h5>${html}`;
        }
      },
      { hitTolerance: 5 }
    );

    if (content) {
      popupContent.innerHTML = content;
      popupOverlay.setPosition(coordinate);
    }
  });

  // ---- Measuring ----
  function createMeasureTooltip() {
    if (measureTooltipElement && measureTooltipElement.parentNode) {
      measureTooltipElement.parentNode.removeChild(measureTooltipElement);
    }
    measureTooltipElement = document.createElement("div");
    measureTooltipElement.className = "ol-tooltip ol-tooltip-measure";
    measureTooltip = new ol.Overlay({
      element: measureTooltipElement,
      offset: [0, -15],
      positioning: "bottom-center",
    });
    map.addOverlay(measureTooltip);
  }

  const formatLength = (line) =>
    line.getLength() > 100
      ? (line.getLength() / 1000).toFixed(2) + " km"
      : line.getLength().toFixed(2) + " m";

  const formatArea = (polygon) =>
    polygon.getArea() > 10000
      ? (polygon.getArea() / 1000000).toFixed(2) + " km²"
      : polygon.getArea().toFixed(2) + " m²";

  function deactivateAllTools() {
    if (draw) map.removeInteraction(draw);
    draw = null;

    if (measureTooltipElement && measureTooltipElement.parentNode) {
      measureTooltipElement.parentNode.removeChild(measureTooltipElement);
      measureTooltipElement = null;
    }

    document
      .querySelectorAll(".map-tools .btn.active")
      .forEach((b) => b.classList.remove("active"));
    panBtn.classList.remove("active");
  }

  function addDrawInteraction(type, source) {
    deactivateAllTools();
    let activeBtn;

    if (type === "LineString") activeBtn = measureDistBtn;
    else if (type === "Polygon" && source === measureSource)
      activeBtn = measureAreaBtn;
    else if (type === "Polygon") activeBtn = drawPolyBtn;

    activeBtn?.classList.add("active");

    draw = new ol.interaction.Draw({ source, type, style: measureStyle });
    map.addInteraction(draw);
    createMeasureTooltip();

    let listener;
    draw.on("drawstart", (evt) => {
      const sketch = evt.feature;
      listener = sketch.getGeometry().on("change", (evt) => {
        const geom = evt.target;
        const output =
          geom instanceof ol.geom.Polygon
            ? formatArea(geom)
            : formatLength(geom);
        const coord = geom.getLastCoordinate
          ? geom.getLastCoordinate()
          : geom.getInteriorPoint().getCoordinates();

        measureTooltipElement.innerHTML = output;
        measureTooltip.setPosition(coord);
      });
    });

    draw.on("drawend", (evt) => {
      const feature = evt.feature;
      const geom = feature.getGeometry();

      if (source === measureSource) {
        measureTooltipElement.className = "ol-tooltip ol-tooltip-static";
        measureTooltip.setOffset([0, -7]);

        const staticEl = document.createElement("div");
        staticEl.className = "ol-tooltip ol-tooltip-static";
        staticEl.innerHTML = measureTooltipElement.innerHTML;

        const staticTip = new ol.Overlay({
          element: staticEl,
          offset: [0, -7],
          position: measureTooltip.getPosition(),
        });
        map.addOverlay(staticTip);
        feature.set("tooltip", staticTip);

        map.removeOverlay(measureTooltip);
        measureTooltipElement = null;
        deactivateAllTools();
      } else {
        // user polygon
        feature.set("area", formatArea(geom));
        // For drawing, let's use a temporary light style
        feature.setStyle(
          new ol.style.Style({
            fill: new ol.style.Fill({ color: "rgba(200, 200, 200, 0.4)" }), // Temporary light gray
            stroke: new ol.style.Stroke({ color: "#888888", width: 2.5 }),
          })
        );

        currentFeature = feature;
        document.getElementById("cropDetailsForm").reset();
        // Reset and hide dropdowns
        cropSeasonSelect.value = "";
        cropTypeSelect.innerHTML = "<option value=''>Select Crop Type</option>";
        cropTypeSelect.disabled = true;
        specificCropSelect.innerHTML =
          "<option value=''>Select Specific Crop</option>";
        specificCropSelect.disabled = true;
        cropTypeGroup.style.display = "none";
        specificCropGroup.style.display = "none";

        cropDetailsModal.show();
      }

      ol.Observable.unByKey(listener);
    });
  }

  // ---- Create Pan Button ----
  const panBtn = document.createElement("button");
  panBtn.id = "panBtn";
  panBtn.className = "btn btn-sm btn-light";
  panBtn.title = "Pan";
  panBtn.innerHTML = '<i class="fas fa-hand-paper"></i>';
  document.querySelector(".map-tools").appendChild(panBtn);

  // ---- Event Listeners for Tools ----
  measureDistBtn.addEventListener("click", () =>
    addDrawInteraction("LineString", measureSource)
  );
  measureAreaBtn.addEventListener("click", () =>
    addDrawInteraction("Polygon", measureSource)
  );
  drawPolyBtn.addEventListener("click", () => {
    if (draw) {
      // already drawing → cancel
      deactivateAllTools();
    } else {
      addDrawInteraction("Polygon", userDrawnSource);
    }
  });
  panBtn.addEventListener("click", () => {
    deactivateAllTools();
    panBtn.classList.add("active");
  });
  clearDrawingsBtn.addEventListener("click", () => {
    deactivateAllTools();
    measureSource.getFeatures().forEach((f) => {
      const tip = f.get("tooltip");
      if (tip) map.removeOverlay(tip);
    });
    measureSource.clear();
    userDrawnSource.clear(); // Clears user-drawn polygons
  });

  // --- Save Crop Details Button (UPDATED) ---
  saveCropDetailsBtn.addEventListener("click", async () => {
    if (!currentFeature) return;

    // Get selected crop and type
    const selectedCropName = specificCropSelect.value;
    const selectedCropType = cropTypeSelect.value; // Get the selected crop type for color assignment

    if (!selectedCropName || !selectedCropType) {
      alert("Please select a Season, Crop Type, and Specific Crop.");
      return;
    }

    // Gather geometry + props
    const geojson = new ol.format.GeoJSON().writeFeatureObject(currentFeature, {
      dataProjection: map.getView().getProjection(),
      featureProjection: "EPSG:4326",
    });
    const props = {
      crop_name: selectedCropName, // Use the selected specific crop name
      sowing_date: document.getElementById("sowingDate").value,
      notes: document.getElementById("cropNotes").value,
      crop_type: selectedCropType, // Send the crop type to the backend
    };

    // Determine color based on selected crop type
    const color =
      CROP_TYPE_COLORS[selectedCropType] || CROP_TYPE_COLORS.Default;
    currentFeature.setStyle(
      new ol.style.Style({
        fill: new ol.style.Fill({
          color: ol.color.asString([...ol.color.asArray(color), 0.4]),
        }), // 0.4 opacity
        stroke: new ol.style.Stroke({ color: color, width: 2.5 }),
      })
    );

    // POST
    const res = await fetch("/map/api/polygons/create/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ geometry: geojson.geometry, properties: props }),
    });
    if (res.ok) {
      userDrawnSource.addFeature(currentFeature); // Add the feature to the source after successful save
      currentFeature = null; // Clear currentFeature as it's now saved
      cropDetailsModal.hide();
      alert("Polygon saved!");
      // You can optionally reload all polygons if you want to ensure state consistency with backend
      // await loadUserPolygons();
    } else {
      alert("Save failed: " + (await res.text()));
      // If save failed, the feature remains on the map (and not added to userDrawnSource yet)
    }
  });

  discardPolygonBtn.addEventListener("click", () => {
    if (currentFeature) userDrawnSource.removeFeature(currentFeature); // Remove if drawing failed
    cropDetailsModal.hide();
    currentFeature = null;
  });

  // ---- WFS Fetch & Helpers ----
  async function fetchWFSFeatures(typeName, cql = null, sortBy = null) {
    const params = new URLSearchParams({
      service: "WFS",
      version: "1.0.0",
      request: "GetFeature",
      typeName,
      outputFormat: "application/json",
      srsName: "EPSG:4326",
      maxFeatures: 1000,
    });
    if (cql) params.append("CQL_FILTER", cql);
    if (sortBy) params.append("SORTBY", sortBy);

    const url = `${WFS_BASE}?${params.toString()}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      return data.features === undefined && data.type === "FeatureCollection"
        ? { type: "FeatureCollection", features: [] }
        : data;
    } catch (err) {
      console.error(`WFS fetch error for ${typeName}:`, err);
      if (searchResultsDiv) {
        searchResultsDiv.innerHTML = `<p style="color:red;">Error: Could not load data.</p>`;
      }
      return { type: "FeatureCollection", features: [] };
    }
  }

  function displayFeatures(source, geojson, mapProjection = "EPSG:3857") {
    source.clear();
    if (!geojson?.features?.length) return;
    try {
      const features = new ol.format.GeoJSON().readFeatures(geojson, {
        dataProjection: "EPSG:4326",
        featureProjection: mapProjection,
      });
      source.addFeatures(features);
    } catch (e) {
      console.error("Error parsing GeoJSON features:", e, geojson);
    }
  }

  function fitMapToSource(source, padding = [50, 50, 50, 50]) {
    if (source.isEmpty()) return;
    const extent = source.getExtent();
    if (ol.extent.isEmpty(extent) || !ol.extent.getArea(extent)) return;
    map.getView().fit(extent, { padding, duration: 1000, maxZoom: 17 });
  }

  async function loadUserPolygons() {
    try {
      const res = await fetch("/map/api/polygons/");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const geojson = await res.json();
      const features = new ol.format.GeoJSON().readFeatures(geojson, {
        dataProjection: "EPSG:4326",
        featureProjection: map.getView().getProjection(),
      });
      userDrawnSource.clear();
      features.forEach((feature) => {
        const savedCropType = feature.getProperties().crop_type;
        const color =
          CROP_TYPE_COLORS[savedCropType] || CROP_TYPE_COLORS.Default;
        feature.setStyle(
          new ol.style.Style({
            fill: new ol.style.Fill({
              color: ol.color.asString([...ol.color.asArray(color), 0.4]),
            }),
            stroke: new ol.style.Stroke({ color: color, width: 2.5 }),
          })
        );
        userDrawnSource.addFeature(feature);
      });
    } catch (err) {
      console.error("Error loading user polygons:", err);
    }
  }

  // ---- Taluka/Village Initialization & Search ----
  async function initializeTalukas() {
    talukaSelect.innerHTML =
      "<option disabled selected>Loading Talukas…</option>";
    const geojson = await fetchWFSFeatures(
      TALUKA_TYPENAME,
      null,
      "thname11 ASC"
    );
    if (!geojson.features.length) {
      talukaSelect.innerHTML =
        "<option disabled selected>No Talukas found</option>";
      return;
    }
    const names = [
      ...new Set(geojson.features.map((f) => f.properties.thname11)),
    ]
      .filter((n) => n?.trim())
      .sort();
    talukaSelect.innerHTML =
      "<option disabled selected value=''>Select Taluka</option>";
    names.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      talukaSelect.appendChild(opt);
    });
  }

  async function initializeData() {
    await initializeTalukas();
    const hcGeoJSON = await fetchWFSFeatures(HEALTHCARE_TYPENAME);
    displayFeatures(healthcareSource, hcGeoJSON, map.getView().getProjection());
    await loadUserPolygons();
  }

  async function performSearch() {
    const text = searchInput.value.trim();
    searchResultsDiv.innerHTML = "<p>Searching...</p>";
    searchHighlightSource.clear();
    popupOverlay.setPosition(undefined);

    if (!text) {
      searchResultsDiv.innerHTML = "<p>Enter village name.</p>";
      return;
    }

    const cqlFilter = `name ILIKE '%${text.replace(/'/g, "''")}%'`;
    const geojson = await fetchWFSFeatures(
      VILLAGE_TYPENAME,
      cqlFilter,
      "name ASC"
    );

    if (geojson?.features?.length) {
      searchResultsDiv.innerHTML = "";
      const features = new ol.format.GeoJSON().readFeatures(geojson, {
        dataProjection: "EPSG:4326",
        featureProjection: map.getView().getProjection(),
      });

      features.forEach((feature) => {
        const props = feature.getProperties();
        const item = document.createElement("div");
        item.classList.add("search-result-item");
        item.innerHTML = `${props.name} <small style="color:#777">(${props.t_name})</small>`;
        item.onclick = () => {
          searchHighlightSource.clear();
          searchHighlightSource.addFeature(feature.clone());
          fitMapToSource(searchHighlightSource, [70, 70, 70, 70]);

          const center = ol.extent.getCenter(feature.getGeometry().getExtent());
          popupContent.innerHTML = `
                        <h5>Village Info</h5>
                        <table>
                            <tr><th>Name:</th><td>${props.name}</td></tr>
                            <tr><th>Taluka:</th><td>${props.t_name}</td></tr>
                        </table>`;
          popupOverlay.setPosition(center);
        };
        searchResultsDiv.appendChild(item);
      });
    } else {
      searchResultsDiv.innerHTML = `<p>No results found for "${text}".</p>`;
    }
  }

  // ---- Event Listeners ----
  talukaSelect.addEventListener("change", async (e) => {
    const tal = e.target.value;
    deactivateAllTools();
    selectedVillageSource.clear();
    villageSource.clear();
    searchHighlightSource.clear();

    if (!tal) {
      map
        .getView()
        .animate({ center: initialCenter, zoom: initialZoom, duration: 1000 });
      return;
    }

    villageSelect.innerHTML = "<option disabled>Loading Villages…</option>";
    villageSelect.disabled = true;

    const talBoundary = await fetchWFSFeatures(
      TALUKA_TYPENAME,
      `thname11='${tal.replace(/'/g, "''")}'`
    );
    displayFeatures(talukaSource, talBoundary, map.getView().getProjection());
    fitMapToSource(talukaSource);

    const villages = await fetchWFSFeatures(
      VILLAGE_TYPENAME,
      `t_name='${tal.replace(/'/g, "''")}'`,
      "name ASC"
    );
    displayFeatures(villageSource, villages, map.getView().getProjection());

    const names = [...new Set(villages.features.map((f) => f.properties.name))]
      .filter((n) => n?.trim())
      .sort();

    villageSelect.innerHTML =
      "<option disabled selected value=''>Select Village</option>";
    names.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      villageSelect.appendChild(opt);
    });
    villageSelect.disabled = false;
  });

  villageSelect.addEventListener("change", async (e) => {
    const vil = e.target.value;
    deactivateAllTools();
    searchHighlightSource.clear();
    selectedVillageSource.clear();

    if (!vil) return;
    const tal = talukaSelect.value;
    const cql = `name='${vil.replace(/'/g, "''")}' AND t_name='${tal.replace(
      /'/g,
      "''"
    )}'`;
    const selGeo = await fetchWFSFeatures(VILLAGE_TYPENAME, cql);
    displayFeatures(
      selectedVillageSource,
      selGeo,
      map.getView().getProjection()
    );
    fitMapToSource(selectedVillageSource, [30, 30, 30, 30]);
  });

  searchButton.addEventListener("click", performSearch);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") performSearch();
  });

  window.addEventListener("resize", () => {
    if (map) map.updateSize();
  });

  cropSeasonSelect.addEventListener("change", () => {
    const season = cropSeasonSelect.value;
    cropTypeSelect.innerHTML = "<option value=''>Select Crop Type</option>";
    specificCropSelect.innerHTML =
      "<option value=''>Select Specific Crop</option>";
    cropTypeSelect.disabled = true;
    specificCropSelect.disabled = true;
    cropTypeGroup.style.display = "none";
    specificCropGroup.style.display = "none";

    if (season && CROP_DATA[season]) {
      for (const type in CROP_DATA[season]) {
        const opt = document.createElement("option");
        opt.value = type;
        opt.textContent = type;
        cropTypeSelect.appendChild(opt);
      }
      cropTypeSelect.disabled = false;
      cropTypeGroup.style.display = "block";
    }
  });

  cropTypeSelect.addEventListener("change", () => {
    const season = cropSeasonSelect.value;
    const type = cropTypeSelect.value;
    specificCropSelect.innerHTML =
      "<option value=''>Select Specific Crop</option>";
    specificCropSelect.disabled = true;
    specificCropGroup.style.display = "none";

    if (season && type && CROP_DATA[season] && CROP_DATA[season][type]) {
      CROP_DATA[season][type].forEach((crop) => {
        const opt = document.createElement("option");
        opt.value = crop;
        opt.textContent = crop;
        specificCropSelect.appendChild(opt);
      });
      specificCropSelect.disabled = false;
      specificCropGroup.style.display = "block";
    }
  });

  // ---- Initialize ----
  initializeData();
});
