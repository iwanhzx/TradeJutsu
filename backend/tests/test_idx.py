from app.core.idx import round_to_tick, LOT_SIZE, BUY_FEE, SELL_FEE


def test_constants():
    assert LOT_SIZE == 100
    assert BUY_FEE == 0.0015
    assert SELL_FEE == 0.0025


def test_round_to_tick_below_200():
    assert round_to_tick(150.7) == 150.0
    assert round_to_tick(199.9) == 199.0


def test_round_to_tick_200_to_499():
    assert round_to_tick(201.0) == 200.0
    assert round_to_tick(203.0) == 202.0
    assert round_to_tick(499.0) == 498.0


def test_round_to_tick_500_to_1999():
    assert round_to_tick(503.0) == 500.0
    assert round_to_tick(1997.0) == 1995.0


def test_round_to_tick_2000_plus():
    assert round_to_tick(2010.0) == 2000.0
    assert round_to_tick(5030.0) == 5025.0
    assert round_to_tick(10049.0) == 10025.0
