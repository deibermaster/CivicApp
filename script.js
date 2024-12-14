// Mapa Leaflet centrado en Montería, Córdoba
const map = L.map('map').setView([8.74798, -75.88143], 13); // Coordenadas de Montería

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let marker;

// Captura las coordenadas al hacer clic en el mapa
map.on('click', (e) => {
  const { lat, lng } = e.latlng; // Obtiene latitud y longitud
  document.getElementById("latitude").value = lat; // Establece el valor en el campo oculto
  document.getElementById("longitude").value = lng;

  // Si ya existe un marcador, lo elimina antes de agregar uno nuevo
  if (marker) {
    map.removeLayer(marker);
  }
  marker = L.marker([lat, lng]).addTo(map); // Agrega un nuevo marcador
});

// Manejo del formulario de reporte
document.getElementById("reportForm").addEventListener("submit", function (e) {
  e.preventDefault(); // Previene la recarga de la página
  submitReport();
});

async function submitReport() {
  const description = document.getElementById("description").value;
  const latitude = document.getElementById("latitude").value;
  const longitude = document.getElementById("longitude").value;
  const photoFile = document.getElementById("photo").files[0];

  // Validación para asegurar que los campos obligatorios estén completos
  if (!description || !latitude || !longitude) {
    alert("Por favor, complete todos los campos antes de enviar el reporte.");
    return;
  }

  const formData = new FormData();
  formData.append("description", description);
  formData.append("latitude", latitude); // Coordenadas capturadas del mapa
  formData.append("longitude", longitude);
  if (photoFile) {
    formData.append("photo", photoFile);
  }

  try {
    const token = localStorage.getItem("authToken");

    const response = await fetch("http://localhost:3000/api/reports", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}` // Incluye el token en el encabezado
      },
      body: formData, // Envía los datos del formulario
    });

    if (response.ok) {
      alert("Reporte enviado con éxito.");
      document.getElementById("reportForm").reset();
      if (marker) map.removeLayer(marker); // Elimina el marcador del mapa después de enviar
    } else {
      const error = await response.json();
      alert(`Error al enviar el reporte: ${error.message || "Ocurrió un error."}`);
    }
  } catch (error) {
    console.error("Error en el envío del reporte:", error);
    alert("Ocurrió un error. Por favor, intente de nuevo.");
  }
}

