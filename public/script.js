// Bu hadisə HTML sənədi tam yükləndikdən və emal edildikdən sonra işə düşür.
document.addEventListener('DOMContentLoaded', () => {

    // ---- 1. DOM ELEMENTLƏRİNİN SEÇİLMƏSİ ----
    // Lazımi elementləri əvvəlcədən seçib sabitlərdə saxlamaq performansı artırır.
    const regionButtonsContainer = document.getElementById('region-buttons');
    const contentSections = document.querySelectorAll('.region-content');
    const uploadForm = document.getElementById('upload-form');
    const uploadStatus = document.getElementById('upload-status');

    // ---- 2. ƏSAS FUNKSİYALAR ----

    /**
     * Aktiv bölgənin vizual və əlçatanlıq vəziyyətini yeniləyir.
     * @param {string} activeRegionId - Aktiv ediləcək bölgənin ID-si (məsələn, 'baku').
     */
    const updateActiveRegionUI = (activeRegionId) => {
        // Bütün düymələri və məzmun bölmələrini qeyri-aktiv edirik.
        regionButtonsContainer.querySelectorAll('.region-btn').forEach(button => {
            button.classList.remove('active');
            button.setAttribute('aria-selected', 'false');
        });
        contentSections.forEach(section => {
            section.classList.remove('active');
        });

        // Yalnız seçilmiş bölgənin düyməsini və məzmununu aktiv edirik.
        const activeButton = regionButtonsContainer.querySelector(`[data-region="${activeRegionId}"]`);
        const activeSection = document.getElementById(activeRegionId);

        if (activeButton && activeSection) {
            activeButton.classList.add('active');
            activeButton.setAttribute('aria-selected', 'true');
            activeSection.classList.add('active');
        }
    };

    /**
     * Müəyyən bir bölgə üçün şəkilləri serverdən yükləyir və qalereyada göstərir.
     * @param {string} regionId - Şəkilləri yüklənəcək bölgənin ID-si.
     */
    const renderImages = async (regionId) => {
        const gallery = document.querySelector(`#${regionId} .gallery`);
        gallery.innerHTML = '<p>Loading images...</p>'; // Gözləmə mesajı

        try {
            const response = await fetch(`/images/${regionId}`);
            if (!response.ok) {
                // Serverdən gələn xəta cavabını idarə edirik.
                throw new Error(`Network response was not ok. Status: ${response.status}`);
            }
            const imageUrls = await response.json();

            gallery.innerHTML = ''; // Gözləmə mesajını təmizləyirik.

            if (imageUrls.length === 0) {
                gallery.innerHTML = '<p>No images uploaded for this region yet.</p>';
                return;
            }

            // Performans üçün DocumentFragment istifadə edirik.
            const fragment = document.createDocumentFragment();
            imageUrls.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                img.alt = `Image of ${regionId}`;
                img.loading = 'lazy'; // Lazy loading - şəkillər yalnız görünəndə yüklənir.
                fragment.appendChild(img);
            });

            // Bütün şəkilləri bir dəfəyə DOM-a əlavə edirik.
            gallery.appendChild(fragment);

        } catch (error) {
            console.error('Error fetching or rendering images:', error);
            gallery.innerHTML = '<p style="color: red;">Could not load images. Please check the connection and try again.</p>';
        }
    };

    /**
     * Bölgə dəyişdirmə hadisəsini idarə edir.
     * @param {string} regionId - Yeni seçilmiş bölgənin ID-si.
     */
    const handleRegionChange = (regionId) => {
        updateActiveRegionUI(regionId);
        renderImages(regionId);
    };

    /**
     * Şəkil yükləmə formasının "submit" hadisəsini idarə edir.
     * @param {Event} event - Forma "submit" hadisəsi.
     */
    const handleFormSubmit = async (event) => {
        event.preventDefault(); // Səhifənin yenilənməsinin qarşısını alırıq.

        const formData = new FormData(uploadForm);
        const selectedRegion = formData.get('region');
        
        uploadStatus.textContent = 'Uploading, please wait...';
        uploadStatus.style.color = 'blue';

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                // Server tərəfindən göndərilən xəta mesajını göstəririk.
                throw new Error(result.message || 'Upload failed due to a server error.');
            }

            uploadStatus.textContent = result.message;
            uploadStatus.style.color = 'green';
            uploadForm.reset(); // Formanı təmizləyirik.

            // Yükləmə uğurlu olduqda, həmin bölgənin şəkillərini yeniləyirik.
            renderImages(selectedRegion);

        } catch (error) {
            console.error('Upload Error:', error);
            uploadStatus.textContent = `Error: ${error.message}`;
            uploadStatus.style.color = 'red';
        }
    };

    // ---- 3. HADİSƏ DİNLEYİCİLƏRİ (EVENT LISTENERS) ----

    // Event Delegation: Tək bir dinləyici ilə bütün düymə kliklərini idarə edirik.
    regionButtonsContainer.addEventListener('click', (event) => {
        const clickedButton = event.target.closest('.region-btn');
        if (clickedButton) {
            const regionId = clickedButton.dataset.region;
            handleRegionChange(regionId);
        }
    });

    // Forma üçün "submit" dinləyicisi.
    uploadForm.addEventListener('submit', handleFormSubmit);


    // ---- 4. İLK YÜKLƏMƏ ----
    // Səhifə ilk dəfə açılanda aktiv olan bölgənin məzmununu yükləyirik.
    const initialActiveRegion = regionButtonsContainer.querySelector('.region-btn.active')?.dataset.region;
    if (initialActiveRegion) {
        handleRegionChange(initialActiveRegion);
    }
});