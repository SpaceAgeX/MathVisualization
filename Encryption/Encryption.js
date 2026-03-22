document.addEventListener("DOMContentLoaded", function () {
    const themeToggle = document.getElementById("theme-toggle");
    const infoToggle = document.getElementById("info-toggle");
    const infoModal = document.getElementById("info-modal");
    const infoBackdrop = document.getElementById("info-backdrop");
    const infoClose = document.getElementById("info-close");
    const algorithmSelect = document.getElementById("algorithm");
    const cipherVariableSlot = document.getElementById("cipher-variable-slot");
    const sharedOptionsSlot = document.getElementById("shared-options-slot");
    const shiftGroupTemplate = document.getElementById("shift-group-template");
    const keywordGroupTemplate = document.getElementById("keyword-group-template");
    const rsaGroupTemplate = document.getElementById("rsa-group-template");
    const classicalOptionsTemplate = document.getElementById("classical-options-template");
    const plainTextInput = document.getElementById("plain-text");
    const encryptedTextInput = document.getElementById("encrypted-text");
    const liveNotes = document.getElementById("live-notes");
    const standardTimeOutput = document.getElementById("standard-time");
    const superTimeOutput = document.getElementById("super-time");
    const publicKeyCopy = document.getElementById("public-key-copy");
    const privateKeyCopy = document.getElementById("private-key-copy");
    const weaknessCopy = document.getElementById("weakness-copy");
    const observationCopy = document.getElementById("observation-copy");
    let primeList = [];
    let primeListLoaded = false;
    let primeListError = null;

    const controlState = {
        shift: 1,
        keyword: "Keyword",
        primePIndex: 11,
        primeQIndex: 12,
        letterCase: "preserve",
        preserveSpacing: true
    };

    let shiftInput = null;
    let shiftValue = null;
    let keywordInput = null;
    let primePIndexInput = null;
    let primeQIndexInput = null;
    let primePValue = null;
    let primeQValue = null;
    let letterCaseSelect = null;
    let preserveSpacingInput = null;

    function syncThemeUi() {
        const isLightMode = document.body.classList.contains("light-mode");
        themeToggle.textContent = isLightMode ? "Dark" : "Light";
        themeToggle.setAttribute(
            "aria-label",
            isLightMode ? "Switch to dark mode" : "Switch to light mode"
        );
    }

    function openInfoModal() {
        infoModal.hidden = false;
        document.body.classList.add("modal-open");
    }

    function closeInfoModal() {
        infoModal.hidden = true;
        document.body.classList.remove("modal-open");
    }

    function getShiftLetter(shift) {
        return String.fromCharCode(65 + Number(shift));
    }

    function getPrimeFromIndex(index) {
        if (primeList.length === 0) {
            return null;
        }

        return primeList[Math.max(0, Math.min(primeList.length - 1, Number(index) - 1))];
    }

    async function loadPrimeList() {
        try {
            const response = await fetch("primes_list.txt", { cache: "no-store" });

            if (!response.ok) {
                throw new Error("Prime list request failed.");
            }

            const text = await response.text();
            primeList = text
                .split(/\r?\n/)
                .map(function (line) {
                    return Number(line.trim());
                })
                .filter(function (value) {
                    return Number.isInteger(value) && value > 1;
                });

            if (primeList.length === 0) {
                throw new Error("Prime list is empty.");
            }

            controlState.primePIndex = Math.max(1, Math.min(controlState.primePIndex, primeList.length));
            controlState.primeQIndex = Math.max(1, Math.min(controlState.primeQIndex, primeList.length));

            primeListLoaded = true;
            primeListError = null;
        } catch (error) {
            primeListLoaded = false;
            primeListError = error;
        }
    }

    function gcd(a, b) {
        let x = BigInt(a);
        let y = BigInt(b);

        while (y !== 0n) {
            const temp = x % y;
            x = y;
            y = temp;
        }

        return x;
    }

    function modPow(base, exponent, modulus) {
        let result = 1n;
        let currentBase = BigInt(base) % BigInt(modulus);
        let currentExponent = BigInt(exponent);
        const mod = BigInt(modulus);

        while (currentExponent > 0n) {
            if (currentExponent % 2n === 1n) {
                result = (result * currentBase) % mod;
            }

            currentExponent /= 2n;
            currentBase = (currentBase * currentBase) % mod;
        }

        return result;
    }

    function extendedGcd(a, b) {
        if (b === 0n) {
            return { gcd: a, x: 1n, y: 0n };
        }

        const result = extendedGcd(b, a % b);
        return {
            gcd: result.gcd,
            x: result.y,
            y: result.x - (a / b) * result.y
        };
    }

    function modInverse(a, m) {
        const result = extendedGcd(BigInt(a), BigInt(m));
        if (result.gcd !== 1n) {
            return null;
        }

        return ((result.x % BigInt(m)) + BigInt(m)) % BigInt(m);
    }

    function mountCipherVariableControl() {
        const activeId = algorithmSelect.value === "caesar"
            ? "shift-group"
            : algorithmSelect.value === "vigenere"
                ? "keyword-group"
                : "rsa-group";
        const existingControl = cipherVariableSlot.firstElementChild;

        if (existingControl && existingControl.id === activeId) {
            return;
        }

        cipherVariableSlot.replaceChildren();
        shiftInput = null;
        shiftValue = null;
        keywordInput = null;
        primePIndexInput = null;
        primeQIndexInput = null;
        primePValue = null;
        primeQValue = null;

        if (algorithmSelect.value === "caesar") {
            cipherVariableSlot.appendChild(shiftGroupTemplate.content.firstElementChild.cloneNode(true));
            shiftInput = document.getElementById("shift");
            shiftValue = document.getElementById("shift-value");
            shiftInput.value = String(controlState.shift);
            shiftInput.addEventListener("input", updateEncryption);
            shiftInput.addEventListener("change", updateEncryption);
        } else if (algorithmSelect.value === "vigenere") {
            cipherVariableSlot.appendChild(keywordGroupTemplate.content.firstElementChild.cloneNode(true));
            keywordInput = document.getElementById("keyword");
            keywordInput.value = controlState.keyword;
            keywordInput.addEventListener("input", updateEncryption);
            keywordInput.addEventListener("change", updateEncryption);
        } else {
            cipherVariableSlot.appendChild(rsaGroupTemplate.content.firstElementChild.cloneNode(true));
            primePIndexInput = document.getElementById("prime-p-index");
            primeQIndexInput = document.getElementById("prime-q-index");
            primePValue = document.getElementById("prime-p-value");
            primeQValue = document.getElementById("prime-q-value");
            primePIndexInput.max = String(primeList.length);
            primeQIndexInput.max = String(primeList.length);
            primePIndexInput.value = String(controlState.primePIndex);
            primeQIndexInput.value = String(controlState.primeQIndex);
            primePIndexInput.addEventListener("input", updateEncryption);
            primePIndexInput.addEventListener("change", updateEncryption);
            primeQIndexInput.addEventListener("input", updateEncryption);
            primeQIndexInput.addEventListener("change", updateEncryption);
        }
    }

    function mountSharedOptions() {
        const needsClassicalOptions = algorithmSelect.value !== "rsa";
        const existingControl = sharedOptionsSlot.firstElementChild;

        if (!needsClassicalOptions) {
            sharedOptionsSlot.replaceChildren();
            letterCaseSelect = null;
            preserveSpacingInput = null;
            return;
        }

        if (existingControl && existingControl.id === "classical-options-group") {
            return;
        }

        sharedOptionsSlot.replaceChildren();
        sharedOptionsSlot.appendChild(classicalOptionsTemplate.content.firstElementChild.cloneNode(true));
        letterCaseSelect = document.getElementById("letter-case");
        preserveSpacingInput = document.getElementById("preserve-spacing");
        letterCaseSelect.value = controlState.letterCase;
        preserveSpacingInput.checked = controlState.preserveSpacing;
        letterCaseSelect.addEventListener("input", updateEncryption);
        letterCaseSelect.addEventListener("change", updateEncryption);
        preserveSpacingInput.addEventListener("input", updateEncryption);
        preserveSpacingInput.addEventListener("change", updateEncryption);
    }

    function applyCase(text) {
        if (!letterCaseSelect) {
            return text;
        }

        if (letterCaseSelect.value === "upper") {
            return text.toUpperCase();
        }

        return text;
    }

    function shouldKeepCharacter(character) {
        return /[a-z]/i.test(character);
    }

    function shiftCharacter(character, offset) {
        if (!/[a-z]/i.test(character)) {
            return preserveSpacingInput && preserveSpacingInput.checked ? character : "";
        }

        const code = character.charCodeAt(0);
        const isUpper = code >= 65 && code <= 90;
        const base = isUpper ? 65 : 97;
        const shifted = ((code - base + offset) % 26 + 26) % 26;
        return String.fromCharCode(base + shifted);
    }

    function encryptCaesar(text) {
        const shift = Number(shiftInput.value);
        return text
            .split("")
            .map(function (character) {
                return shiftCharacter(character, shift);
            })
            .join("");
    }

    function sanitizeKeyword() {
        const cleaned = keywordInput.value.replace(/[^a-z]/gi, "").slice(0, 25);
        keywordInput.value = cleaned;
        return cleaned || "math";
    }

    function encryptVigenere(text) {
        const keyword = sanitizeKeyword().toLowerCase();
        let keywordIndex = 0;

        return text
            .split("")
            .map(function (character) {
                if (!shouldKeepCharacter(character)) {
                    return preserveSpacingInput && preserveSpacingInput.checked ? character : "";
                }

                const shift = keyword.charCodeAt(keywordIndex % keyword.length) - 97;
                keywordIndex += 1;
                return shiftCharacter(character, shift);
            })
            .join("");
    }

    function buildRsaKeys() {
        if (!primeListLoaded || primeList.length === 0) {
            return {
                valid: false,
                message: primeListError
                    ? "Prime list failed to load. Use a local server so RSA can read primes_list.txt."
                    : "Loading prime list..."
            };
        }

        const p = getPrimeFromIndex(primePIndexInput.value);
        const q = getPrimeFromIndex(primeQIndexInput.value);

        if (p === q) {
            return {
                valid: false,
                message: "Choose two different primes so RSA has two distinct factors."
            };
        }

        const n = BigInt(p * q);
        const phi = BigInt((p - 1) * (q - 1));
        const possibleExponents = [65537n, 257n, 17n, 5n, 3n];
        let e = null;

        for (const candidate of possibleExponents) {
            if (candidate < phi && gcd(candidate, phi) === 1n) {
                e = candidate;
                break;
            }
        }

        if (e === null) {
            return {
                valid: false,
                message: "No valid public exponent was found for this prime pair."
            };
        }

        const d = modInverse(e, phi);
        if (d === null) {
            return {
                valid: false,
                message: "The modular inverse for the private key could not be computed."
            };
        }

        return {
            valid: true,
            p,
            q,
            n,
            e,
            d
        };
    }

    function encryptRsa(text, rsaKeys) {
        if (!rsaKeys.valid) {
            return rsaKeys.message;
        }

        if (rsaKeys.n <= 255n) {
            return "Choose larger primes so the modulus n is greater than 255 and can encode text bytes.";
        }

        return Array.from(text).map(function (character) {
            const code = BigInt(character.charCodeAt(0));
            return modPow(code, rsaKeys.e, rsaKeys.n).toString();
        }).join(" ");
    }

    function estimateKeySpace() {
        if (algorithmSelect.value === "caesar") {
            return 25;
        }

        if (algorithmSelect.value === "rsa") {
            const rsaKeys = buildRsaKeys();
            return rsaKeys.valid ? Number(rsaKeys.n) : 0;
        }

        const keyword = sanitizeKeyword();
        return Math.pow(26, Math.max(keyword.length, 1));
    }

    function formatDuration(seconds) {
        if (seconds < 1e-6) {
            return "Effectively instant";
        }

        if (seconds < 1) {
            return "< 1 second";
        }

        const minute = 60;
        const hour = 60 * minute;
        const day = 24 * hour;
        const year = 365 * day;

        if (seconds < minute) {
            return seconds.toFixed(1) + " seconds";
        }

        if (seconds < hour) {
            return (seconds / minute).toFixed(1) + " minutes";
        }

        if (seconds < day) {
            return (seconds / hour).toFixed(1) + " hours";
        }

        if (seconds < year) {
            return (seconds / day).toFixed(1) + " days";
        }

        if (seconds < 1e6 * year) {
            return (seconds / year).toFixed(1) + " years";
        }

        return (seconds / year).toExponential(2) + " years";
    }

    function getAnalysisCopy(keySpace) {
        if (algorithmSelect.value === "caesar") {
            return {
                weakness: "Caesar only has 25 meaningful shifts, so brute force and frequency analysis break it almost immediately.",
                observation: "This is useful for demonstrating substitution mechanics, but not for real protection."
            };
        }

        if (algorithmSelect.value === "rsa") {
            return {
                weakness: "Without very large primes, the modulus can be factored and the private key can be recovered easily.",
                observation: "Changing either prime changes n, phi(n), the public key, and the private key."
            };
        }

        if (keySpace < 1e6) {
            return {
                weakness: "A short Vigenere keyword still leaks repeating patterns and can be attacked with frequency analysis and keyword-length detection.",
                observation: "Increasing the keyword length raises the brute-force space, but classical pattern attacks still matter."
            };
        }

        if (keySpace < 1e10) {
            return {
                weakness: "Longer keywords make brute force harder, but repeated-key structure remains a major vulnerability.",
                observation: "This lands in a better educational range, where you can compare brute-force growth against structural weaknesses."
            };
        }

        return {
            weakness: "Even with a large key space, Vigenere is still a classical cipher and not secure against modern cryptanalysis.",
            observation: "The estimates grow quickly, which makes the difference between brute force and actual cryptanalytic weaknesses easy to see."
        };
    }

    function updateLayoutControls() {
        mountCipherVariableControl();
        mountSharedOptions();

        if (letterCaseSelect) {
            controlState.letterCase = letterCaseSelect.value;
        }

        if (preserveSpacingInput) {
            controlState.preserveSpacing = preserveSpacingInput.checked;
        }

        if (algorithmSelect.value === "caesar" && shiftInput && shiftValue) {
            controlState.shift = Number(shiftInput.value);
            shiftValue.textContent = getShiftLetter(shiftInput.value);
        }

        if (algorithmSelect.value === "vigenere" && keywordInput) {
            controlState.keyword = keywordInput.value;
        }

        if (algorithmSelect.value === "rsa" && primePIndexInput && primeQIndexInput) {
            controlState.primePIndex = Number(primePIndexInput.value);
            controlState.primeQIndex = Number(primeQIndexInput.value);
            primePValue.textContent = primeListLoaded ? String(getPrimeFromIndex(primePIndexInput.value)) : "...";
            primeQValue.textContent = primeListLoaded ? String(getPrimeFromIndex(primeQIndexInput.value)) : "...";
        }
    }

    function updateEncryption() {
        updateLayoutControls();

        const plainText = plainTextInput.value;
        let encrypted = "";
        let publicKeyText = "Not used";
        let privateKeyText = "Not used";

        if (algorithmSelect.value === "caesar") {
            encrypted = applyCase(encryptCaesar(plainText));
        } else if (algorithmSelect.value === "vigenere") {
            encrypted = applyCase(encryptVigenere(plainText));
        } else {
            const rsaKeys = buildRsaKeys();
            encrypted = encryptRsa(plainText, rsaKeys);

            if (rsaKeys.valid) {
                publicKeyText = `(${rsaKeys.e.toString()}, ${rsaKeys.n.toString()})`;
                privateKeyText = `(${rsaKeys.d.toString()}, ${rsaKeys.n.toString()})`;
            } else {
                publicKeyText = rsaKeys.message;
                privateKeyText = rsaKeys.message;
            }
        }

        encryptedTextInput.value = encrypted;

        const keySpace = estimateKeySpace();
        const standardSeconds = keySpace / 1e9;
        const superSeconds = keySpace / 1e15;
        const analysis = getAnalysisCopy(keySpace);

        standardTimeOutput.textContent = formatDuration(standardSeconds);
        superTimeOutput.textContent = formatDuration(superSeconds);
        publicKeyCopy.textContent = publicKeyText;
        privateKeyCopy.textContent = privateKeyText;
        weaknessCopy.textContent = analysis.weakness;
        observationCopy.textContent = analysis.observation;

        if (algorithmSelect.value === "caesar") {
            liveNotes.textContent = "Caesar shifts every letter by the same fixed amount. It is simple to visualize, but there are so few possible keys that it is not practical for security.";
        } else if (algorithmSelect.value === "vigenere") {
            liveNotes.textContent = "Vigenere uses a repeating keyword to vary the shift for each letter. That makes it stronger than Caesar, but the repeated pattern still gives attackers structure to exploit.";
        } else {
            liveNotes.textContent = primeListLoaded
                ? "RSA is an asymmetric encryption system built from two prime numbers. This demo lets you choose those ramdom primes between 1,000,000 and 1,000,000,000 and then builds the public key and private key from the selected pair."
                : "RSA is waiting for primes_list.txt to load so it can populate the prime sliders.";
        }
    }

    themeToggle.addEventListener("click", function () {
        document.body.classList.toggle("light-mode");
        syncThemeUi();
    });
    infoToggle.addEventListener("click", openInfoModal);
    infoClose.addEventListener("click", closeInfoModal);
    infoBackdrop.addEventListener("click", closeInfoModal);

    [algorithmSelect, plainTextInput].forEach(function (element) {
        element.addEventListener("input", updateEncryption);
        element.addEventListener("change", updateEncryption);
    });

    window.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !infoModal.hidden) {
            closeInfoModal();
        }
    });

    syncThemeUi();
    loadPrimeList().finally(updateEncryption);
});
