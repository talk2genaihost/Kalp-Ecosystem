import 'package:flutter_test/flutter_test.dart';
import '../lib/catalog.dart';

void main() {
  test('KMRL catalog contains 45 governed experiments', () {
    expect(experiments.length, 45);
    expect(experiments.where((e) => e.domain == 'PHYSICS').length, 15);
    expect(experiments.where((e) => e.domain == 'CHEMISTRY').length, 15);
    expect(experiments.where((e) => e.domain == 'MATHEMATICS').length, 15);
  });

  test('approved collision experiment is present', () {
    final e = experiments.firstWhere((x) => x.id == 'PHY-MEC-007');
    expect(e.modelId, 'collision_momentum');
  });
}
