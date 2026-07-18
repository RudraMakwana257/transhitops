def test_vehicles_crud(client, company_b_token):
    """Test CRUD operations for vehicles."""
    # List empty
    res = client.get('/api/vehicles', headers={'Authorization': f'Bearer {company_b_token}'})
    assert res.status_code == 200
    assert len(res.json['data']['items']) == 0
    
    # Create
    res = client.post('/api/vehicles', headers={'Authorization': f'Bearer {company_b_token}'}, json={
        'reg_number': 'VEH-100', 'name': 'Truck', 'type': 'Truck', 'capacity_kg': 5000, 'acquisition_cost': 75000
    })
    assert res.status_code == 201
    vehicle_id = res.json['data']['id']
    
    # Duplicate reg
    res2 = client.post('/api/vehicles', headers={'Authorization': f'Bearer {company_b_token}'}, json={
        'reg_number': 'VEH-100', 'name': 'Truck', 'type': 'Truck', 'capacity_kg': 5000, 'acquisition_cost': 75000
    })
    assert res2.status_code == 400
    
    # Missing fields
    res3 = client.post('/api/vehicles', headers={'Authorization': f'Bearer {company_b_token}'}, json={
        'name': 'Truck'
    })
    assert res3.status_code == 422
    
    # Get created
    res4 = client.get(f'/api/vehicles/{vehicle_id}', headers={'Authorization': f'Bearer {company_b_token}'})
    assert res4.status_code == 200
    assert res4.json['data']['reg_number'] == 'VEH-100'
    
    # Update
    res5 = client.put(f'/api/vehicles/{vehicle_id}', headers={'Authorization': f'Bearer {company_b_token}'}, json={
        'name': 'Updated Truck'
    })
    assert res5.status_code == 200
    assert res5.json['data']['name'] == 'Updated Truck'
    
    # Search filter
    res6 = client.get('/api/vehicles?search=VEH-100', headers={'Authorization': f'Bearer {company_b_token}'})
    assert res6.status_code == 200
    assert len(res6.json['data']['items']) == 1
    
    # Delete
    res7 = client.delete(f'/api/vehicles/{vehicle_id}', headers={'Authorization': f'Bearer {company_b_token}'})
    assert res7.status_code == 200
