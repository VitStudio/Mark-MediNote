/**
 * Biometric (WebAuthn) — registration & user menu
 */

export function initBiometric() {
    const menuBtn = document.getElementById('user-menu-btn');
    const dropdown = document.getElementById('user-menu-dropdown');
    const biometricBtn = document.getElementById('btn-biometric');
    const biometricLabel = document.getElementById('biometric-label');
    const biometricModal = document.getElementById('biometricModal');
    const btnRegister = document.getElementById('btn-register-biometric');
    const biometricStatus = document.getElementById('biometric-status');

    if (!menuBtn || !dropdown) return;

    let menuOpen = false;

    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menuOpen = !menuOpen;
        dropdown.style.display = menuOpen ? 'block' : 'none';
    });

    document.addEventListener('click', (e) => {
        if (menuOpen && !dropdown.contains(e.target) && e.target !== menuBtn) {
            menuOpen = false;
            dropdown.style.display = 'none';
        }
    });

    function setBiometricLabel(hasCredential) {
        if (biometricLabel) {
            biometricLabel.textContent = hasCredential ? 'Face ID enabled' : 'Enable Face ID login';
        }
    }

    async function checkBiometricStatus() {
        try {
            const res = await fetch('webauthn-has-credential.php', { credentials: 'same-origin' });
            const data = await res.json();
            setBiometricLabel(data.hasCredential === true);
        } catch (_) {
            setBiometricLabel(false);
        }
    }

    biometricBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        dropdown.style.display = 'none';
        menuOpen = false;
        if (biometricModal) {
            biometricStatus.textContent = '';
            biometricModal.showModal();
            checkBiometricStatus();
        }
    });

    btnRegister?.addEventListener('click', async () => {
        if (!biometricStatus) return;
        biometricStatus.textContent = 'Preparing…';
        try {
            const optsRes = await fetch('webauthn-register-options.php', { credentials: 'same-origin' });
            const optsData = await optsRes.json();
            if (!optsData.success || !optsData.options) {
                biometricStatus.textContent = optsData.error || 'Failed to get options';
                return;
            }

            const options = optsData.options;
            options.challenge = base64urlDecode(options.challenge);
            options.user.id = base64urlDecode(options.user.id);
            if (options.excludeCredentials) {
                options.excludeCredentials = options.excludeCredentials.map(c => ({
                    ...c,
                    id: base64urlDecode(c.id)
                }));
            }

            const credential = await navigator.credentials.create({ publicKey: options });
            if (!credential) {
                biometricStatus.textContent = 'Registration cancelled';
                return;
            }

            const response = credential.response;
            const payload = {
                id: credential.id,
                rawId: base64urlEncode(credential.rawId),
                type: credential.type,
                response: {
                    clientDataJSON: base64urlEncode(response.clientDataJSON),
                    attestationObject: base64urlEncode(response.attestationObject)
                }
            };

            const regRes = await fetch('webauthn-register-verify.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(payload)
            });
            const regData = await regRes.json();

            if (regData.success) {
                biometricStatus.textContent = 'Biometric enabled successfully.';
                setBiometricLabel(true);
                setTimeout(() => biometricModal?.close(), 1500);
            } else {
                biometricStatus.textContent = regData.error || 'Registration failed';
            }
        } catch (err) {
            biometricStatus.textContent = err.message || 'Biometric not supported or cancelled';
        }
    });

    function base64urlEncode(buf) {
        const bin = String.fromCharCode(...new Uint8Array(buf));
        return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function base64urlDecode(str) {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) str += '=';
        return Uint8Array.from(atob(str), c => c.charCodeAt(0));
    }

    checkBiometricStatus();
}
