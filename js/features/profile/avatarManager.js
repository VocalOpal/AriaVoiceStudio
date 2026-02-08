// Avatar Manager - handles profile image upload and display
import { put, get, remove, STORES } from '../../core/storage.js';
import { showToast } from '../../ui/toast.js';

export async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
        showToast('Image must be less than 2MB', 'error');
        return;
    }

    try {
        // Convert to base64
        const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        // Resize image
        const resizedUrl = await resizeImage(dataUrl, 200, 200);

        // Save to storage
        await put(STORES.METADATA, {
            key: 'profileImage',
            data: resizedUrl,
            updatedAt: Date.now()
        });

        // Update avatar displays
        const modalAvatar = document.getElementById('modalProfileAvatar');
        const sidebarAvatar = document.getElementById('profileAvatar');

        if (modalAvatar) {
            setAvatarImage(modalAvatar, resizedUrl, '50%');
        }
        if (sidebarAvatar) {
            setAvatarImage(sidebarAvatar, resizedUrl, '10px');
        }

        showToast('Profile picture updated!', 'success');

    } catch (err) {
        console.error('[Avatar] Upload failed:', err);
        showToast('Failed to upload image', 'error');
    }
}

function setAvatarImage(container, src, borderRadius) {
    let img = container.querySelector('img');
    if (!img) {
        container.textContent = '';
        img = document.createElement('img');
        img.alt = 'Profile';
        img.style.cssText = `width:100%;height:100%;object-fit:cover;border-radius:${borderRadius};`;
        container.appendChild(img);
    }
    img.src = src;
}

function resizeImage(dataUrl, maxWidth, maxHeight) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round(height * maxWidth / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round(width * maxHeight / height);
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = dataUrl;
    });
}

export async function removeProfileImage() {
    try {
        await remove(STORES.METADATA, 'profileImage');

        const modalAvatar = document.getElementById('modalProfileAvatar');
        const sidebarAvatar = document.getElementById('profileAvatar');

        if (modalAvatar) {
            const img = modalAvatar.querySelector('img');
            if (img) img.remove();
            modalAvatar.textContent = modalAvatar.dataset.initial || 'U';
        }
        if (sidebarAvatar) {
            const img = sidebarAvatar.querySelector('img');
            if (img) img.remove();
            sidebarAvatar.textContent = sidebarAvatar.dataset.initial || 'U';
        }

        showToast('Profile picture removed', 'info');
    } catch (err) {
        console.error('[Avatar] Remove failed:', err);
        showToast('Failed to remove image', 'error');
    }
}

export async function loadProfileImage() {
    try {
        const imageData = await get(STORES.METADATA, 'profileImage');
        if (imageData?.data) {
            const modalAvatar = document.getElementById('modalProfileAvatar');
            const sidebarAvatar = document.getElementById('profileAvatar');

            if (modalAvatar) {
                setAvatarImage(modalAvatar, imageData.data, '50%');
            }
            if (sidebarAvatar) {
                setAvatarImage(sidebarAvatar, imageData.data, '10px');
            }
        }
    } catch (err) {
        console.error('[Profile] Failed to load profile image:', err);
    }
}
