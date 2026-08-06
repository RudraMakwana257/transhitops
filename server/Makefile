test:
	python -m pytest tests/ -v --cov=app --cov-report=term-missing

test-fast:
	python -m pytest tests/ -v -x

test-security:
	python -m pytest tests/test_security.py -v

demo:
	flask seed-demo

pre-demo:
	./scripts/pre_demo.sh
