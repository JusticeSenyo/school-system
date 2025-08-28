// src/config/storage.js
export const OCI = {
  REGION: 'af-johannesburg-1',
  NAMESPACE: 'axw84jvjnipe',
  BUCKET: 'school',
  // Your bucket-level WRITE PAR (must end with /o/)
  PAR_BASE_URL:
    'https://objectstorage.af-johannesburg-1.oraclecloud.com/p/1GLzXhOUElx3shqiczJCCpAb-jA9DCSevtGLRHNMIAcj1Yhh_2BnAuATEzv2-C79/n/axw84jvjnipe/b/school/o/',
};

// Key: staff/<school_id>/<user_id>.<ext>
export function buildStaffKey(schoolId, userId, ext = 'jpg') {
  return `staff/${schoolId}/${userId}.${String(ext).toLowerCase()}`;
}

// Public (read) URL (works if bucket/obj readable or you later use READ PAR/proxy)
export function buildPublicUrl(key) {
  return `https://objectstorage.${OCI.REGION}.oraclecloud.com/n/${OCI.NAMESPACE}/b/${OCI.BUCKET}/o/${encodeURIComponent(key)}`;
}

export async function putToOCI(file, key) {
  const uploadUrl = `${OCI.PAR_BASE_URL}${encodeURIComponent(key)}`;
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`OCI upload failed: ${res.status} ${txt}`);
  }
  return true;
}
