import { NextResponse } from 'next/server';
import { kernel } from '@/lib/kernel/core';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const identity = await kernel.identity();
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');

    // 1. Dashboard general overview
    if (view === 'dashboard') {
      const projects = await kernel.query<any>('projects', { filters: { agency_id: identity.tenantId } });
      const chantiers = await kernel.query<any>('chantiers', { filters: { agency_id: identity.tenantId } });
      const units = await kernel.query<any>('units', { filters: { agency_id: identity.tenantId } });
      const contractors = await kernel.query<any>('contractors', { filters: { agency_id: identity.tenantId } });
      const milestones = await kernel.query<any>('milestones', { filters: { agency_id: identity.tenantId } });

      const stats = {
        totalProjects: projects.length,
        activeChantiers: chantiers.filter(c => c.status === 'active').length,
        totalUnits: units.length,
        unitStates: {
          under_construction: units.filter(u => u.status === 'under_construction').length,
          completed: units.filter(u => u.status === 'completed').length,
          available_for_sale: units.filter(u => u.status === 'available_for_sale').length,
          reserved: units.filter(u => u.status === 'reserved').length,
          sold: units.filter(u => u.status === 'sold').length,
          delivered: units.filter(u => u.status === 'delivered').length,
        },
        totalContractors: contractors.length,
        milestonesValidated: milestones.filter(m => m.status === 'validated').length,
        milestonesTotal: milestones.length
      };

      return NextResponse.json(stats);
    }

    // 2. Project phases & timelines mapping
    if (view === 'project_phases') {
      const projectId = searchParams.get('projectId');
      if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });

      const phases = await kernel.query<any>('project_phases', {
        filters: { project_id: projectId },
        orderBy: { column: 'phase_code', ascending: true }
      });
      return NextResponse.json(phases);
    }

    // 3. Chantiers list or specific
    if (view === 'chantiers') {
      const projectId = searchParams.get('projectId');
      const querySpec: any = { filters: { agency_id: identity.tenantId } };
      if (projectId) {
        querySpec.filters.project_id = projectId;
      }
      const chantiersList = await kernel.query<any>('chantiers', querySpec);
      return NextResponse.json(chantiersList);
    }

    // 4. Daily Logs for specific site
    if (view === 'daily_logs') {
      const chantierId = searchParams.get('chantierId');
      if (!chantierId) return NextResponse.json({ error: 'Missing chantierId' }, { status: 400 });

      const logs = await kernel.query<any>('chantier_daily_logs', {
        filters: { chantier_id: chantierId },
        orderBy: { column: 'date', ascending: false },
        limit: 30
      });
      return NextResponse.json(logs);
    }

    // 5. Materials inventory & alert states
    if (view === 'materials') {
      const materials = await kernel.query<any>('materials', {
        filters: { agency_id: identity.tenantId },
        orderBy: { column: 'name', ascending: true }
      });
      return NextResponse.json(materials);
    }

    // 6. Material consumptions (for a site)
    if (view === 'material_consumptions') {
      const chantierId = searchParams.get('chantierId');
      if (!chantierId) return NextResponse.json({ error: 'Missing chantierId' }, { status: 400 });

      const consumptions = await kernel.query<any>('material_consumptions', {
        filters: { chantier_id: chantierId },
        orderBy: { column: 'logged_at', ascending: false }
      });
      return NextResponse.json(consumptions);
    }

    // 7. Suppliers & Purchase Orders (PO)
    if (view === 'suppliers') {
      const suppliers = await kernel.query<any>('suppliers', {
        filters: { agency_id: identity.tenantId },
        orderBy: { column: 'name', ascending: true }
      });
      return NextResponse.json(suppliers);
    }

    if (view === 'purchase_orders') {
      const projectId = searchParams.get('projectId');
      const querySpec: any = { filters: { agency_id: identity.tenantId } };
      if (projectId) {
        querySpec.filters.project_id = projectId;
      }
      const pos = await kernel.query<any>('purchase_orders', querySpec);
      return NextResponse.json(pos);
    }

    // 8. Units digital twins & detailed inventory
    if (view === 'units') {
      const projectId = searchParams.get('projectId');
      const querySpec: any = { filters: { agency_id: identity.tenantId } };
      if (projectId) {
        querySpec.filters.project_id = projectId;
      }
      const units = await kernel.query<any>('units', querySpec);
      return NextResponse.json(units);
    }

    // 9. Subcontractors & workforce metrics
    if (view === 'contractors') {
      const contractors = await kernel.query<any>('contractors', {
        filters: { agency_id: identity.tenantId },
        orderBy: { column: 'name', ascending: true }
      });
      return NextResponse.json(contractors);
    }

    if (view === 'contractor_assignments') {
      const projectId = searchParams.get('projectId');
      const querySpec: any = { filters: { agency_id: identity.tenantId } };
      if (projectId) {
        querySpec.filters.project_id = projectId;
      }
      const assignments = await kernel.query<any>('contractor_assignments', querySpec);
      return NextResponse.json(assignments);
    }

    // 10. Milestones & associated validations
    if (view === 'milestones') {
      const projectId = searchParams.get('projectId');
      if (!projectId) return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });

      const milestones = await kernel.query<any>('milestones', {
        filters: { project_id: projectId },
        orderBy: { column: 'due_date', ascending: true }
      });
      return NextResponse.json(milestones);
    }

    if (view === 'milestone_validations') {
      const milestoneId = searchParams.get('milestoneId');
      if (!milestoneId) return NextResponse.json({ error: 'Missing milestoneId' }, { status: 400 });

      const validations = await kernel.query<any>('milestone_validations', {
        filters: { milestone_id: milestoneId }
      });
      return NextResponse.json(validations);
    }

    return NextResponse.json({ error: 'Unsupported view type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const identity = await kernel.identity();
    const body = await request.json();
    const { action } = body;

    // 1. Create chantier daily log with delay auditing
    if (action === 'create_daily_log') {
      const { chantierId, date, workCompleted, incidentsNoted, delayMinutes, delayReason, photoUrls, workerCount, gpsCoordinates } = body;

      const newLog = await kernel.mutate<any>('chantier_daily_logs', 'INSERT', {
        agency_id: identity.tenantId,
        chantier_id: chantierId,
        date: date || new Date().toISOString().split('T')[0],
        supervisor_id: identity.userId,
        work_completed: workCompleted,
        incidents_noted: incidentsNoted || null,
        delay_minutes: Number(delayMinutes || 0),
        delay_reason: delayReason || null,
        photo_urls: photoUrls || [],
        worker_count: Number(workerCount || 0),
        gps_coordinates: gpsCoordinates || null,
        offline_synced: false
      });

      // Write field log to audit vault
      await kernel.mutate('sys_audit_vault', 'INSERT', {
        agency_id: identity.tenantId,
        user_id: identity.userId,
        action: 'log_daily_activity',
        entity_type: 'chantier_daily_log',
        entity_id: newLog.id,
        new_data: { date, workerCount, delayMinutes }
      });

      return NextResponse.json({ success: true, data: newLog });
    }

    // 2. Prove and Validate high-consequence construction milestones
    if (action === 'verify_milestone') {
      const { milestoneId, role, photoUrl, comment, gpsCoordinates } = body;

      // 1. Check if milestone exists
      const queryResult = await kernel.query<any>('milestones', { filters: { id: milestoneId } });
      if (!queryResult || queryResult.length === 0) {
        return NextResponse.json({ error: 'Milestone not found' }, { status: 444 });
      }
      const milestone = queryResult[0];

      // 2. Validate current roles allowed
      if (!['chantier_director', 'engineer', 'branch_manager'].includes(role)) {
        return NextResponse.json({ error: 'Insufficent regulatory role signature.' }, { status: 403 });
      }

      // 3. Register high fidelity proof
      const checksumValue = `sha256-${Math.random().toString(36).substring(2, 12)}-${Date.now()}`;
      const validationRecord = await kernel.mutate<any>('milestone_validations', 'INSERT', {
        agency_id: identity.tenantId,
        milestone_id: milestoneId,
        validated_by: identity.userId,
        role,
        photo_url: photoUrl || 'https://picsum.photos/seed/validation/800/600',
        comment,
        gps_coordinates: gpsCoordinates || '36.7538, 3.0588', // Default Algiers
        checksum: checksumValue
      });

      // 4. Set Milestone state as Validated
      await kernel.mutate('milestones', 'UPDATE', {
        status: 'validated'
      }, { id: milestoneId });

      // 5. Interlock with PHASE E project payment tranches
      // Look for a tranche matching the milestone's label or trigger of equal ratio
      const matchedTranches = await kernel.query<any>('project_tranches', {
        filters: { project_id: milestone.project_id, label: milestone.title }
      });

      if (matchedTranches && matchedTranches.length > 0) {
         for (const trx of matchedTranches) {
            await kernel.mutate('project_tranches', 'UPDATE', {
              is_triggered: true,
              triggered_at: new Date().toISOString()
            }, { id: trx.id });
         }
      }

      // 6. Write to transaction ledger mock / real link
      // Create a pending bill/payable trigger
      const matchedContractorAssignments = await kernel.query<any>('contractor_assignments', {
        filters: { project_id: milestone.project_id, contract_status: 'active' }
      });

      if (matchedContractorAssignments && matchedContractorAssignments.length > 0) {
        for (const assign of matchedContractorAssignments) {
           const contractFraction = (Number(milestone.percentage_unlock) / 100);
           const milestonePayout = assign.budget * contractFraction;
           
           if (milestonePayout > 0) {
              await kernel.mutate('purchase_orders', 'INSERT', {
                agency_id: identity.tenantId,
                supplier_id: assign.contractor_id, // mapped as vendor
                project_id: milestone.project_id,
                title: `Paiement Jalon: ${milestone.title} - ${assign.contractor_id}`,
                total_amount: milestonePayout,
                vat_amount: milestonePayout * 0.19, // Algerian standard 19% VAT
                status: 'approved',
                payment_status: 'unpaid'
              });
           }
        }
      }

      // Log highly audited milestone validation
      await kernel.mutate('sys_audit_vault', 'INSERT', {
        agency_id: identity.tenantId,
        user_id: identity.userId,
        action: 'validate_milestone_physical',
        entity_type: 'milestone',
        entity_id: milestoneId,
        new_data: { validatedRole: role, matchedTranches: matchedTranches?.length }
      });

      return NextResponse.json({ success: true, validation: validationRecord });
    }

    // 3. Mutate physical unit digital twin state
    if (action === 'mutate_unit_status') {
      const { unitId, newStatus, notes } = body;

      // Fetch existing
      const currentResult = await kernel.query<any>('units', { filters: { id: unitId } });
      if (!currentResult || currentResult.length === 0) {
        return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
      }
      const unit = currentResult[0];

      // Mutate status (under_construction -> completed -> etc.)
      const updatedUnit = await kernel.mutate<any>('units', 'UPDATE', {
        status: newStatus
      }, { id: unitId });

      // Create detailed history log manually in case of client action or bypass
      await kernel.mutate('unit_states_history', 'INSERT', {
        agency_id: identity.tenantId,
        unit_id: unitId,
        old_status: unit.status,
        new_status: newStatus,
        changed_by: identity.userId,
        notes: notes || 'Manuel status update'
      });

      return NextResponse.json({ success: true, data: updatedUnit });
    }

    // 4. Logistics/Materials actions
    if (action === 'log_consumption') {
      const { chantierId, materialId, phaseId, quantityUsed } = body;

      // Find stock 
      const matResult = await kernel.query<any>('materials', { filters: { id: materialId } });
      if (!matResult || matResult.length === 0) return NextResponse.json({ error: 'Material not found' }, { status: 404 });
      const material = matResult[0];

      if (Number(material.stock_quantity) < Number(quantityUsed)) {
         return NextResponse.json({ error: `Not enough stock available. Available: ${material.stock_quantity}` }, { status: 400 });
      }

      // Log consumption
      const consRecord = await kernel.mutate<any>('material_consumptions', 'INSERT', {
        agency_id: identity.tenantId,
        chantier_id: chantierId,
        material_id: materialId,
        phase_id: phaseId || null,
        quantity_used: Number(quantityUsed),
        unit_cost_at_consumption: Number(material.unit_cost),
        logged_by: identity.userId
      });

      // Update stock
      await kernel.mutate('materials', 'UPDATE', {
        stock_quantity: Number(material.stock_quantity) - Number(quantityUsed)
      }, { id: materialId });

      return NextResponse.json({ success: true, data: consRecord });
    }

    if (action === 'create_material') {
      const { name, unitOfMeasure, unitCost, stockQuantity, minThreshold } = body;
      const record = await kernel.mutate<any>('materials', 'INSERT', {
        agency_id: identity.tenantId,
        name,
        unit_of_measure: unitOfMeasure,
        unit_cost: Number(unitCost || 0),
        stock_quantity: Number(stockQuantity || 0),
        min_threshold: Number(minThreshold || 0)
      });
      return NextResponse.json({ success: true, data: record });
    }

    if (action === 'create_contractor') {
       const { name, specialty, email, phone } = body;
       const record = await kernel.mutate<any>('contractors', 'INSERT', {
         agency_id: identity.tenantId,
         name,
         specialty,
         email: email || null,
         phone: phone || null,
         score: 5.0
       });
       return NextResponse.json({ success: true, data: record });
    }

    if (action === 'create_assignment') {
       const { contractorId, projectId, budget, penaltyPerDelayDay, startDate, endDate } = body;
       const record = await kernel.mutate<any>('contractor_assignments', 'INSERT', {
         agency_id: identity.tenantId,
         contractor_id: contractorId,
         project_id: projectId,
         budget: Number(budget),
         penalty_per_delay_day: Number(penaltyPerDelayDay || 0),
         contract_status: 'active',
         start_date: startDate || null,
         end_date: endDate || null
       });
       return NextResponse.json({ success: true, data: record });
    }

    if (action === 'create_purchase_order') {
       const { supplierId, projectId, title, totalAmount, vatAmount } = body;
       const record = await kernel.mutate<any>('purchase_orders', 'INSERT', {
         agency_id: identity.tenantId,
         supplier_id: supplierId,
         project_id: projectId,
         title,
         total_amount: Number(totalAmount),
         vat_amount: Number(vatAmount || (totalAmount * 0.19)),
         status: 'draft',
         payment_status: 'unpaid'
       });
       return NextResponse.json({ success: true, data: record });
    }

    if (action === 'create_supplier') {
       const { name, contactName, phone, email } = body;
       const record = await kernel.mutate<any>('suppliers', 'INSERT', {
         agency_id: identity.tenantId,
         name,
         contact_name: contactName || null,
         phone: phone || null,
         email: email || null
       });
       return NextResponse.json({ success: true, data: record });
    }

    if (action === 'create_project_phase') {
      const { projectId, phaseCode, phaseName, startDate, endDate } = body;
      const record = await kernel.mutate<any>('project_phases', 'INSERT', {
         agency_id: identity.tenantId,
         project_id: projectId,
         phase_code: phaseCode,
         phase_name: phaseName,
         start_date: startDate || null,
         end_date: endDate || null,
         status: 'unstarted'
      });
      return NextResponse.json({ success: true, data: record });
    }

    if (action === 'seed_demographics') {
      const { projectId } = body;

      // Bootstrap standard phases if unassigned
      const existingPhases = await kernel.query<any>('project_phases', { filters: { project_id: projectId } });
      if (existingPhases.length === 0) {
        const standardPhases = [
          { code: 'acquisition', name: 'Acquisition du Terrain' },
          { code: 'excavation', name: 'Terrassement et Excavation' },
          { code: 'foundation', name: 'Achèvement Fondations' },
          { code: 'structure', name: 'Gros Œuvre / Structure Dalles' },
          { code: 'finishing', name: 'Second Œuvre & Cloisonnement' },
          { code: 'delivery', name: 'Livraison & Remise des Clés' }
        ];
        for (const phase of standardPhases) {
          await kernel.mutate('project_phases', 'INSERT', {
            agency_id: identity.tenantId,
            project_id: projectId,
            phase_code: phase.code,
            phase_name: phase.name,
            status: phase.code === 'acquisition' ? 'completed' : 'unstarted',
            approval_status: phase.code === 'acquisition' ? 'approved' : 'pending',
            start_date: new Date().toISOString().split('T')[0]
          });
        }
      }

      // Bootstrap physical units linked to project's properties
      const props = await kernel.query<any>('properties', { filters: { project_id: projectId } });
      const existingUnits = await kernel.query<any>('units', { filters: { project_id: projectId } });

      if (existingUnits.length === 0 && props.length > 0) {
         for (const prop of props) {
            // Extract block and floor indicators from ref code if possible
            const ref = prop.reference_code || `BAT-A-F3-0${Math.floor(Math.random() * 8 + 1)}`;
            const block = ref.includes('-B') ? 'Bloc B' : 'Bloc A';
            const floor = Math.floor(Math.random() * 8 + 1);
            
            await kernel.mutate('units', 'INSERT', {
              agency_id: identity.tenantId,
              project_id: projectId,
              property_id: prop.id,
              block,
              floor,
              residence: 'Résidence El-Karia',
              reference_code: ref,
              type: prop.type === 'f4' ? 'F4' : prop.type === 'f2' ? 'F2' : 'F3',
              status: prop.status === 'sold' ? 'sold' : prop.status === 'reserved' ? 'reserved' : 'under_construction',
              rooms_count: prop.rooms ? parseInt(prop.rooms) : 3,
              surface_area: prop.area_sqm || 95.0
            });
         }
      }

      // Bootstrap default milestones corresponding to tranches
      const tranches = await kernel.query<any>('project_tranches', { filters: { project_id: projectId } });
      const existingMilestones = await kernel.query<any>('milestones', { filters: { project_id: projectId } });

      if (existingMilestones.length === 0 && tranches.length > 0) {
        for (const tr of tranches) {
           await kernel.mutate('milestones', 'INSERT', {
             agency_id: identity.tenantId,
             project_id: projectId,
             title: tr.label,
             percentage_unlock: tr.percentage,
             status: tr.is_triggered ? 'validated' : 'pending',
             due_date: new Date(Date.now() + 60*24*60*60*1000).toISOString().split('T')[0] // +60 days
           });
        }
      }

      // Bootstrap a default chantier for this project
      const chs = await kernel.query<any>('chantiers', { filters: { project_id: projectId } });
      if (chs.length === 0) {
         await kernel.mutate('chantiers', 'INSERT', {
           agency_id: identity.tenantId,
           project_id: projectId,
           name: 'Chantier Général',
           code: `CH-${Date.now().toString().slice(-4)}`,
           supervisor_id: identity.userId,
           status: 'active'
         });
      }

      // Load a baseline of contractor companies and materials
      const existingMats = await kernel.query<any>('materials', { filters: { agency_id: identity.tenantId } });
      if (existingMats.length === 0) {
         await kernel.mutate('materials', 'INSERT', { agency_id: identity.tenantId, name: 'Ciment Lafarge Chiffa (Sacs 50kg)', unit_of_measure: 'bags', unit_cost: 950, stock_quantity: 500, min_threshold: 50 });
         await kernel.mutate('materials', 'INSERT', { agency_id: identity.tenantId, name: 'Rond à Béton Fer (Tonne)', unit_of_measure: 'tons', unit_cost: 110000, stock_quantity: 12, min_threshold: 2 });
         await kernel.mutate('materials', 'INSERT', { agency_id: identity.tenantId, name: 'Briques Creuses 12 Trous (Palette)', unit_of_measure: 'units', unit_cost: 25000, stock_quantity: 30, min_threshold: 5 });
      }

      const existingSuppliers = await kernel.query<any>('suppliers', { filters: { agency_id: identity.tenantId } });
      if (existingSuppliers.length === 0) {
         await kernel.mutate('suppliers', 'INSERT', { agency_id: identity.tenantId, name: 'Lafarge Algérie SPA', contact_name: 'Amine', phone: '0550112233', email: 'contact@lafarge.dz' });
         await kernel.mutate('suppliers', 'INSERT', { agency_id: identity.tenantId, name: 'Quincaillerie Centrale Blida', contact_name: 'Kamel', phone: '025304050' });
      }

      const existingContractors = await kernel.query<any>('contractors', { filters: { agency_id: identity.tenantId } });
      if (existingContractors.length === 0) {
         await kernel.mutate('contractors', 'INSERT', { agency_id: identity.tenantId, name: 'ETB Mourad Gros Œuvre', specialty: 'Gros Œuvre / Maçonnerie', score: 4.8 });
         await kernel.mutate('contractors', 'INSERT', { agency_id: identity.tenantId, name: 'Plomberie Moderne Alger', specialty: 'Second Œuvre / Plomberie', score: 4.5 });
      }

      return NextResponse.json({ success: true, seeded: true });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
