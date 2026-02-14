import assert from "node:assert/strict";
import test from "node:test";
import { formatPhoneAsUs, isValidEmailFormat, isValidPhoneFormat, validateContact } from "../src/lib/contactValidation.js";
test("email validation accepts standard address and rejects malformed address", () => {
    assert.equal(isValidEmailFormat("team@onsightoptics.com"), true);
    assert.equal(isValidEmailFormat("team@onsightoptics"), false);
});
test("phone formatting normalizes to ###-###-#### and strips extras", () => {
    assert.equal(formatPhoneAsUs("(619) 402-1033"), "619-402-1033");
    assert.equal(formatPhoneAsUs("6194021033555"), "619-402-1033");
});
test("phone validation requires strict ###-###-#### format", () => {
    assert.equal(isValidPhoneFormat("619-402-1033"), true);
    assert.equal(isValidPhoneFormat("(619) 402-1033"), false);
});
test("contact validator reports missing and invalid fields separately", () => {
    const result = validateContact({
        fullName: "Jonathan",
        companyName: "On-Sight Safety Optics",
        email: "bad-email",
        phone: "6194021033",
    });
    assert.deepEqual(result.missing, []);
    assert.deepEqual(result.invalid, ["Email", "Phone"]);
    assert.equal(result.isValid, false);
});
