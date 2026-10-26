import sys
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models import User, Exam, Question, Attempt, Answer

client = TestClient(app)

def run_tests():
    print("--- STARTING ANTI-TAB-SWITCHING FEATURE TESTS ---")

    # 1. Setup Test User and Test Exam in DB
    db = SessionLocal()

    test_user = db.query(User).filter(User.email == "tab_test_user@example.com").first()
    if not test_user:
        test_user = User(name="Tab Test Student", email="tab_test_user@example.com", password="password123", role="student")
        db.add(test_user)
        db.commit()
        db.refresh(test_user)

    test_exam = db.query(Exam).filter(Exam.title == "Tab Switch Test Exam").first()
    if not test_exam:
        test_exam = Exam(title="Tab Switch Test Exam", description="Testing Tab Switching", duration=30)
        db.add(test_exam)
        db.commit()
        db.refresh(test_exam)

    test_question = db.query(Question).filter(Question.exam_id == test_exam.id).first()
    if not test_question:
        test_question = Question(
            exam_id=test_exam.id,
            question_text="What is 2+2?",
            option_a="3",
            option_b="4",
            option_c="5",
            option_d="6",
            correct_option="B"
        )
        db.add(test_question)
        db.commit()
        db.refresh(test_question)

    user_id = test_user.id
    exam_id = test_exam.id
    question_id = test_question.id

    db.close()

    # TEST 1: Initial Attempt Creation
    print("\n[TEST 1] Creating new attempt...")
    response = client.post("/attempts", json={"user_id": user_id, "exam_id": exam_id})
    assert response.status_code == 200, f"Failed start_attempt: {response.text}"
    attempt_data = response.json()
    attempt_id = attempt_data["attempt_id"]
    print(f"Created attempt_id: {attempt_id}")
    assert attempt_data.get("tab_switch_count") == 0, f"Expected count 0, got {attempt_data.get('tab_switch_count')}"
    assert attempt_data.get("terminated") is False, f"Expected terminated False, got {attempt_data.get('terminated')}"
    assert attempt_data.get("termination_reason") is None, f"Expected termination_reason None, got {attempt_data.get('termination_reason')}"
    print("PASS: Test 1 - Initial attempt state is 0/false/null")

    # TEST 2: First Violation
    print("\n[TEST 2] First tab switch violation...")
    res1 = client.post(f"/attempts/{attempt_id}/tab-switch", json={})
    assert res1.status_code == 200, f"Failed tab switch 1: {res1.text}"
    json1 = res1.json()
    print(f"Response 1: {json1}")
    assert json1["tab_switch_count"] == 1, f"Expected 1, got {json1['tab_switch_count']}"
    assert json1["terminated"] is False, f"Expected False, got {json1['terminated']}"
    assert json1["termination_reason"] is None, f"Expected None, got {json1['termination_reason']}"
    print("PASS: Test 2 - 1st violation count is 1, not terminated")

    # TEST 3: Second Violation
    print("\n[TEST 3] Second tab switch violation...")
    res2 = client.post(f"/attempts/{attempt_id}/tab-switch", json={})
    assert res2.status_code == 200, f"Failed tab switch 2: {res2.text}"
    json2 = res2.json()
    print(f"Response 2: {json2}")
    assert json2["tab_switch_count"] == 2, f"Expected 2, got {json2['tab_switch_count']}"
    assert json2["terminated"] is False, f"Expected False, got {json2['terminated']}"
    assert json2["termination_reason"] is None, f"Expected None, got {json2['termination_reason']}"
    print("PASS: Test 3 - 2nd violation count is 2, not terminated")

    # TEST 4: Third Violation (Termination Threshold)
    print("\n[TEST 4] Third tab switch violation...")
    res3 = client.post(f"/attempts/{attempt_id}/tab-switch", json={})
    assert res3.status_code == 200, f"Failed tab switch 3: {res3.text}"
    json3 = res3.json()
    print(f"Response 3: {json3}")
    assert json3["tab_switch_count"] == 3, f"Expected 3, got {json3['tab_switch_count']}"
    assert json3["terminated"] is True, f"Expected True, got {json3['terminated']}"
    assert json3["termination_reason"] == "Excessive tab switching", f"Expected reason 'Excessive tab switching', got {json3['termination_reason']}"
    print("PASS: Test 4 - 3rd violation count is 3, terminated is True")

    # TEST 4b: Subsequent violation when already terminated
    print("\n[TEST 4b] Subsequent tab switch on already terminated attempt...")
    res4 = client.post(f"/attempts/{attempt_id}/tab-switch", json={})
    assert res4.status_code == 200
    json4 = res4.json()
    print(f"Response 4 (Already Terminated): {json4}")
    assert json4["terminated"] is True
    assert json4["termination_reason"] == "Excessive tab switching"
    print("PASS: Test 4b - Already terminated attempt remains persistent and terminated")

    # TEST 5: Persistence check via result / attempt endpoint
    print("\n[TEST 5] Verifying persistence in PostgreSQL via GET /results/attempt/{attempt_id} and GET /attempts/{attempt_id}...")
    res_persistent = client.get(f"/results/attempt/{attempt_id}")
    assert res_persistent.status_code == 200, f"Failed get result: {res_persistent.text}"
    json_pers = res_persistent.json()
    print(f"Persistent result response: {json_pers}")
    assert json_pers["tab_switch_count"] >= 3
    assert json_pers["terminated"] is True
    assert json_pers["termination_reason"] == "Excessive tab switching"

    res_attempt = client.get(f"/attempts/{attempt_id}")
    assert res_attempt.status_code == 200
    json_att = res_attempt.json()
    assert json_att["tab_switch_count"] >= 3
    assert json_att["terminated"] is True
    assert json_att["termination_reason"] == "Excessive tab switching"
    print("PASS: Test 5 - Terminated state safely persisted in PostgreSQL")

    # TEST 7: Attempting submission & answer saving on terminated attempt
    print("\n[TEST 7] Attempting submit on terminated attempt...")
    sub_res = client.post(f"/attempts/{attempt_id}/submit")
    assert sub_res.status_code == 400, f"Expected status 400 for terminated submit, got {sub_res.status_code}"
    print(f"Submit blocked response: {sub_res.json()}")

    print("Attempting save answer on terminated attempt...")
    ans_res = client.post(f"/attempts/{attempt_id}/answers", json={"question_id": question_id, "selected_option": "B"})
    assert ans_res.status_code == 400, f"Expected status 400 for terminated answer save, got {ans_res.status_code}"
    print(f"Save answer blocked response: {ans_res.json()}")
    print("PASS: Test 7 - Terminated attempt correctly blocks submission and answer editing")

    # TEST 6: Normal Exam Attempt Flow (Un-terminated)
    print("\n[TEST 6] Normal exam attempt flow without termination...")
    res_normal = client.post("/attempts", json={"user_id": user_id, "exam_id": exam_id})
    normal_id = res_normal.json()["attempt_id"]

    ans_normal = client.post(f"/attempts/{normal_id}/answers", json={"question_id": question_id, "selected_option": "B"})
    assert ans_normal.status_code == 200

    sub_normal = client.post(f"/attempts/{normal_id}/submit")
    assert sub_normal.status_code == 200
    sub_json = sub_normal.json()
    print(f"Normal submission response: {sub_json}")
    assert sub_json["score"] == 1
    assert sub_json["submitted"] is True
    print("PASS: Test 6 - Normal exam flow works seamlessly")

    print("\n=== ALL TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_tests()
