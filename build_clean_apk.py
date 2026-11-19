import zipfile
import os
import subprocess
import shutil

def build_apk():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    temp_dir = "/tmp/degla_apk_builder"
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)

    print("🚀 Building clean, Android-compliant APK...")

    # 1. Read base binary manifest and patch versionCode to 7
    src_manifest = "/tmp/manifest.bin"
    with open(src_manifest, "rb") as f:
        manifest_data = bytearray(f.read())
    
    # Patch versionCode = 7 at offset 2160
    manifest_data[2160] = 7

    # Read resources.arsc and classes.dex
    src_apk = os.path.join(root_dir, "public/download/WadiDeglaAttendance.apk")
    with zipfile.ZipFile(src_apk, "r") as zin:
        arsc_data = zin.read("resources.arsc")
        dex_data = zin.read("classes.dex")

    # Read 3D Gold Shield Icon (192x192)
    icon_path = os.path.join(root_dir, "public/icon-192.png")
    with open(icon_path, "rb") as f:
        icon_data = f.read()

    # 2. Package unsigned APK:
    # Android Specification REQUIREMENT:
    # resources.arsc and raw drawables MUST BE STORED (0% compression) for Android AssetManager mmap!
    unsigned_apk = os.path.join(temp_dir, "unsigned.apk")
    with zipfile.ZipFile(unsigned_apk, "w") as zout:
        zout.writestr("AndroidManifest.xml", bytes(manifest_data), compress_type=zipfile.ZIP_DEFLATED)
        zout.writestr("resources.arsc", arsc_data, compress_type=zipfile.ZIP_STORED)
        zout.writestr("res/drawable/icon.png", icon_data, compress_type=zipfile.ZIP_STORED)
        zout.writestr("classes.dex", dex_data, compress_type=zipfile.ZIP_DEFLATED)

    print("   ✅ Unsigned APK assembled with uncompressed resources.arsc & icon.png.")

    # 3. Zipalign on 4-byte boundaries
    zipalign = "/Users/davidovic/Library/Android/sdk/build-tools/34.0.0/zipalign"
    aligned_apk = os.path.join(temp_dir, "aligned.apk")
    subprocess.check_call([zipalign, "-p", "-f", "4", unsigned_apk, aligned_apk])
    print("   ✅ 4-byte memory-alignment applied successfully.")

    # 4. Persistent Release Keystore
    keystore = os.path.join(root_dir, "degla-release.keystore")
    if not os.path.exists(keystore):
        cmd = [
            "keytool", "-genkeypair", "-v",
            "-keystore", keystore,
            "-alias", "degla",
            "-keyalg", "RSA",
            "-keysize", "2048",
            "-validity", "10000",
            "-storepass", "wadidegla2026",
            "-keypass", "wadidegla2026",
            "-dname", "CN=Wadi Degla Clubs, OU=Mobile, O=Wadi Degla, C=EG"
        ]
        subprocess.check_call(cmd)
        print("   ✅ Persistent release keystore created.")

    # 5. Sign with apksigner (v1 JAR, v2 Full APK, v3 App Signing)
    apksigner = "/Users/davidovic/Library/Android/sdk/build-tools/34.0.0/apksigner"
    subprocess.check_call([
        apksigner, "sign",
        "--ks", keystore,
        "--ks-pass", "pass:wadidegla2026",
        "--ks-key-alias", "degla",
        "--key-pass", "pass:wadidegla2026",
        "--v1-signing-enabled", "true",
        "--v2-signing-enabled", "true",
        "--v3-signing-enabled", "true",
        aligned_apk
    ])
    print("   ✅ APK signed with v1, v2, and v3 schemes.")

    # 6. Verify Signature & Alignment
    verify_out = subprocess.check_output([apksigner, "verify", "--verbose", aligned_apk]).decode()
    assert "Verified using v1 scheme (JAR signing): true" in verify_out
    assert "Verified using v2 scheme (APK Signature Scheme v2): true" in verify_out
    assert "Verified using v3 scheme (APK Signature Scheme v3): true" in verify_out

    align_out = subprocess.check_output([zipalign, "-c", "-v", "4", aligned_apk]).decode()
    assert "Verification succesful" in align_out
    print("   ✅ Signature and memory alignment verified 100% OK!")

    # 7. Write to public/download and dist/download
    targets = [
        os.path.join(root_dir, "public/download/WadiDeglaAttendance.apk"),
        os.path.join(root_dir, "public/download/OfficeAttendance.apk"),
        os.path.join(root_dir, "dist/download/WadiDeglaAttendance.apk"),
        os.path.join(root_dir, "dist/download/OfficeAttendance.apk")
    ]
    with open(aligned_apk, "rb") as f:
        signed_apk_bytes = f.read()

    for target in targets:
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, "wb") as f:
            f.write(signed_apk_bytes)
        print(f"   💾 Saved: {os.path.basename(target)} ({len(signed_apk_bytes) / 1024:.1f} KB)")

    print("🎉 All Android APKs built and compliant!")

if __name__ == "__main__":
    build_apk()
