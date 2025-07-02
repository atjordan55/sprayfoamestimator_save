import React, { useState } from "react";

const calculatePitchFactor = (pitchStr) => {
  const [rise, run] = pitchStr.split("/").map(Number);
  return Math.sqrt(1 + Math.pow(rise / run, 2));
};

const calculateMaterialValues = (area) => {
  let sqft = area.length * area.width;
  if (area.areaType === "Gable") sqft = sqft / 2;
  if (area.areaType === "Roof Deck") {
    sqft *= calculatePitchFactor(area.roofPitch);
  }
  const ratio = area.foamType === "Open" ? 6 : 2;
  const gallons = ((sqft * (area.foamThickness / ratio)) / 2000) * 55;
  const sets = gallons / 55;
  return { sqft, gallons, sets };
};

const calculateMaterialCost = (area) => {
  const { sqft, gallons, sets } = calculateMaterialValues(area);
  const baseMaterialCost = sets * area.materialPrice;
  const markupAmount = baseMaterialCost * (area.materialMarkup / 100);
  const totalCost = baseMaterialCost + markupAmount;
  return { sqft, gallons, sets, baseMaterialCost, markupAmount, totalCost };
};

const MiniOutput = ({ sqft, gallons, sets, baseMaterialCost, markupAmount, totalCost }) => (
  <div className="text-sm text-gray-700 pt-2">
    SqFt: {sqft.toFixed(1)} | Gallons: {gallons.toFixed(1)} | Sets: {sets.toFixed(2)} |
    Base Cost: ${baseMaterialCost.toFixed(2)} | Markup: ${markupAmount.toFixed(2)} |
    <strong>Total Cost: ${totalCost.toFixed(2)}</strong>
  </div>
);

const labelMap = {
  manualLaborRate: "Manual Labor Rate",
  laborHours: "Labor Hours",
  laborMarkup: "Labor Markup",
  travelDistance: "Travel Distance",
  travelRate: "Travel Rate",
  wasteDisposal: "Waste Disposal",
  equipmentRental: "Equipment Rental",
  length: "Length",
  width: "Width",
  foamType: "Foam Type",
  foamThickness: "Foam Thickness",
  materialPrice: "Material Price",
  materialMarkup: "Material Markup",
  areaType: "Area Type",
  roofPitch: "Roof Pitch"
};

export default function SprayFoamEstimator() {
  const [estimateName, setEstimateName] = useState("");
  const [globalInputs, setGlobalInputs] = useState({
    manualLaborRate: 50,
    laborHours: 0,
    laborMarkup: 40,
    travelDistance: 50,
    travelRate: 0.68,
    wasteDisposal: 50,
    equipmentRental: 0
  });

  const [sprayAreas, setSprayAreas] = useState([{
    length: 0,
    width: 0,
    foamType: "Open",
    foamThickness: 6,
    materialPrice: 1870,
    materialMarkup: 80,
    areaType: "General Area",
    roofPitch: "4/12"
  }]);

  const [actuals, setActuals] = useState({
    actualLaborHours: 0,
    actualOpenGallons: 0,
    actualClosedGallons: 0
  });

  const handleGlobalChange = (key, value) => {
    setGlobalInputs(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const handleActualsChange = (key, value) => {
    setActuals(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const updateArea = (index, key, value) => {
    const updated = [...sprayAreas];
    updated[index][key] = value;
    if (key === "foamType") {
      updated[index].materialMarkup = value === "Open" ? 80 : 75;
      updated[index].foamThickness = value === "Open" ? 6 : 2;
      updated[index].materialPrice = value === "Open" ? 1870 : 2470;
    }
    setSprayAreas(updated);
  };

  const addArea = () => {
    setSprayAreas([...sprayAreas, {
      length: 0,
      width: 0,
      foamType: "Open",
      foamThickness: 6,
      materialPrice: 1870,
      materialMarkup: 80,
      areaType: "General Area",
      roofPitch: "4/12"
    }]);
  };

  const removeArea = (index) => {
    setSprayAreas(sprayAreas.filter((_, i) => i !== index));
  };

  const saveEstimate = () => {
    const json = JSON.stringify({ estimateName, globalInputs, sprayAreas, actuals }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${estimateName || 'spray-foam-estimate'}.json`;
    a.click();
  };

  const loadEstimate = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        setEstimateName(data.estimateName || "");
        setGlobalInputs(data.globalInputs || {});
        setSprayAreas(data.sprayAreas || []);
        setActuals(data.actuals || {});
      } catch (err) {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 space-y-10">
      <div className="flex justify-between items-center">
        <input
          type="text"
          placeholder="Estimate Name"
          value={estimateName}
          onChange={(e) => setEstimateName(e.target.value)}
          className="border p-2 rounded w-1/2"
        />
        <div className="flex space-x-2">
          <button onClick={saveEstimate} className="bg-green-500 text-white px-4 py-2 rounded">Save</button>
          <label className="bg-gray-500 text-white px-4 py-2 rounded cursor-pointer">
            Load
            <input type="file" accept=".json" onChange={loadEstimate} className="hidden" />
          </label>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">Global Inputs</h2>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(globalInputs).map(([key, val]) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1">{labelMap[key] || key}</label>
              <input
                type="number"
                value={val}
                onChange={(e) => handleGlobalChange(key, e.target.value)}
                className="w-full border p-2 rounded"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-2">Spray Areas</h2>
        {sprayAreas.map((area, index) => {
          const { sqft, gallons, sets, baseMaterialCost, markupAmount, totalCost } = calculateMaterialCost(area);
          return (
            <div key={index} className="border p-4 rounded mb-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(area).map(([key, val]) => (
                  key !== "roofPitch" || area.areaType === "Roof Deck" ? (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-1">{labelMap[key] || key}</label>
                      {key === "foamType" || key === "areaType" ? (
                        <select
                          value={val}
                          onChange={(e) => updateArea(index, key, e.target.value)}
                          className="w-full border p-2 rounded"
                        >
                          {(key === "foamType" ? ["Open", "Closed"] : ["General Area", "Roof Deck", "Gable"]).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={typeof val === "number" ? "number" : "text"}
                          value={val}
                          onChange={(e) => updateArea(index, key, e.target.value)}
                          className="w-full border p-2 rounded"
                        />
                      )}
                    </div>
                  ) : null
                ))}
              </div>
              <MiniOutput {...calculateMaterialCost(area)} />
              <button onClick={() => removeArea(index)} className="mt-2 text-red-500">Remove Area</button>
            </div>
          );
        })}
        <button onClick={addArea} className="bg-blue-500 text-white px-4 py-2 rounded">Add Area</button>
      </div>
    </div>
  );
}
