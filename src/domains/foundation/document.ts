// src/domains/foundation/document.ts

import { kernel } from '@/lib/kernel/core';
import { DocumentRecord } from './types';
import { Audit } from './audit';

export class DocumentEngine {
  /**
   * Registers a brand new document reference into the system vault
   */
  public static async register(
    doc: Omit<DocumentRecord, 'id' | 'agencyId' | 'uploadedBy' | 'lifecycleState'>
  ): Promise<any> {
    const identity = await kernel.identity();
    
    const payload = {
      agency_id: identity.tenantId,
      branch_id: doc.branchId || null,
      title: doc.title,
      category: doc.category,
      storage_path: doc.storagePath,
      file_size: doc.fileSize || null,
      mime_type: doc.mimeType || null,
      lifecycle_state: 'uploaded', // immediately marked as uploaded
      associated_entity_type: doc.associatedEntityType,
      associated_entity_id: doc.associatedEntityId,
      uploaded_by: identity.userId,
      hash_signature: doc.hashSignature || null
    };

    const record = await kernel.mutate<any>('document_records', 'INSERT', payload);

    await Audit.log({
      operationType: 'DOCUMENT_UPLOADED',
      entityType: 'document',
      entityId: record.id,
      newValues: { lifecycleState: 'uploaded', title: doc.title }
    });

    return record;
  }

  /**
   * Moves a document forward along its lifecycle states: draft, uploaded, verified, approved, archived, rejected
   */
  public static async updateState(
    documentId: string,
    targetState: 'verified' | 'approved' | 'archived' | 'rejected',
    notesOrJustification?: string
  ): Promise<any> {
    const identity = await kernel.identity();
    
    const existing = await kernel.query('document_records', {
      filters: { id: documentId }
    });
    
    const docObj = existing[0] as any;
    if (!docObj) {
      throw new Error('Document not found in registry');
    }

    const payload: Record<string, any> = {
      lifecycle_state: targetState,
      updated_at: new Date().toISOString()
    };

    if (targetState === 'verified') {
      payload.verified_by = identity.userId;
      payload.verified_at = new Date().toISOString();
    } else if (targetState === 'rejected') {
      payload.rejection_reason = notesOrJustification || 'Discrepancy identified during audit verification';
    }

    const updated = await kernel.mutate<any>('document_records', 'UPDATE', payload, { id: documentId });

    await Audit.log({
      operationType: `DOCUMENT_LIFECYCLE_${targetState.toUpperCase()}`,
      entityType: 'document',
      entityId: documentId,
      oldValues: { previousState: docObj.lifecycle_state },
      newValues: { newState: targetState, notes: notesOrJustification }
    });

    return updated;
  }

  /**
   * Lists all documents matching an associated target business entity (eg: a deal contract, or a supplier invoice)
   */
  public static async queryByEntity(
    associatedEntityType: string,
    associatedEntityId: string
  ): Promise<any[]> {
    try {
      const identity = await kernel.identity();
      return await kernel.query('document_records', {
        filters: {
          agency_id: identity.tenantId,
          associated_entity_type: associatedEntityType,
          associated_entity_id: associatedEntityId
        },
        orderBy: { column: 'created_at', ascending: false }
      });
    } catch {
      return [];
    }
  }
}
export const Documents = DocumentEngine;
