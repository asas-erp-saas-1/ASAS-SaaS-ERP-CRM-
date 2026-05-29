import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import { join } from "path"
import { kernel } from "@/lib/kernel/core"

export async function POST(req: NextRequest) {
  try {
    const { filename, category, dataUrl, dealId, portalUpload } = await req.json()

    if (!filename || !dataUrl || !dealId) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 })
    }

    // Parse base64 content
    const base64Parts = dataUrl.split(";base64,")
    const mimeType = base64Parts[0].split(":")[1] || "application/octet-stream"
    const base64Data = base64Parts[1]

    if (!base64Data) {
      return NextResponse.json({ error: "Données de fichier invalides" }, { status: 400 })
    }

    const buffer = Buffer.from(base64Data, "base64")
    const sizeBytes = buffer.length

    // Define storage path
    const uploadDirName = "uploads"
    const publicDir = join(process.cwd(), "public")
    const uploadDir = join(publicDir, uploadDirName)

    // Ensure upload directory exists
    try {
      await fs.access(uploadDir)
    } catch {
      await fs.mkdir(uploadDir, { recursive: true })
    }

    // Generate unique safe filename
    const timestamp = Date.now()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_")
    const finalFilename = `${timestamp}-${sanitizedFilename}`
    const relativeUrl = `/${uploadDirName}/${finalFilename}`
    const absolutePath = join(uploadDir, finalFilename)

    // Write file to local disk
    await fs.writeFile(absolutePath, buffer)

    // Construct the structured JSON payload for the vault entry description
    const vaultPayload = {
      filename,
      category: category || "Autre",
      url: relativeUrl,
      size: sizeBytes,
      uploadedBy: portalUpload ? "Client" : "Agent",
      mimeType,
      timestamp
    }

    // Save as a note activity prefixed with [VAULT-JSON] to make parsing extremely robust
    // This allows backward compatibility and handles complex structures cleanly
    const mockRes = await fetch(`${req.nextUrl.origin}/api/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deal_id: dealId,
        type: "note",
        description: `[VAULT-JSON] ${JSON.stringify(vaultPayload)}`
      })
    })

    if (!mockRes.ok) {
       throw new Error("Impossible d'enregistrer l'activité relative au document")
    }

    const result = await mockRes.json()

    return NextResponse.json({
      success: true,
      url: relativeUrl,
      activity: result.data
    })
  } catch (error: any) {
    console.error("Document Upload Router Error:", error)
    return NextResponse.json({ error: error.message || "Erreur de téléversement" }, { status: 500 })
  }
}
