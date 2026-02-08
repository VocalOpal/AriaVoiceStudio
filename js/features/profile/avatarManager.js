// Avatar Manager - handles profile image upload and display
import { put, get, STORES } from '../../core/storage.js';
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
            modalAvatar.innerHTML = `<img src="${resizedUrl}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        }
        if (sidebarAvatar) {
            sidebarAvatar.innerHTML = `<img src="${resizedUrl}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
        }

        showToast('Profile picture updated!', 'success');

    } catch (err) {
        console.error('[Avatar] Upload failed:', err);
        showToast('Failed to upload image', 'error');
    }
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

export async function loadProfileImage() {
    try {
        const imageData = await get(STORES.METADATA, 'profileImage');
        if (imageData?.data) {
            const modalAvatar = document.getElementById('modalProfileAvatar');
            const sidebarAvatar = document.getElementById('profileAvatar');

            if (modalAvatar) {
                modalAvatar.innerHTML = `<img src="${imageData.data}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            }
            if (sidebarAvatar) {
                sidebarAvatar.innerHTML = `<img src="${imageData.data}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
            }
        }
    } catch (err) {
        console.error('[Profile] Failed to load profile image:', err);
    }
}
