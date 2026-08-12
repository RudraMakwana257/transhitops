from app import create_app, db
from app.models.company import Company
from app.models.company_feature import CompanyFeature

app = create_app()
with app.app_context():
    companies = Company.query.all()
    features = ['vehicles', 'drivers', 'trips', 'maintenance', 'fuel', 'expenses', 'dashboard', 'analytics', 'ai_chat', 'settings', 'notifications']
    for c in companies:
        for f in features:
            if not CompanyFeature.query.filter_by(company_id=c.id, feature_key=f).first():
                db.session.add(CompanyFeature(company_id=c.id, feature_key=f, is_enabled=True))
    db.session.commit()
    print("Features added!")
