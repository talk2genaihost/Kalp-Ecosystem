import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
class KmrlSync {
 static const baseUrl='https://klbdrswxujewqaazpbcn.supabase.co';
 static const publishableKey='sb_publishable_GN1Gn4rVuKBqgRIP-L-3lg_ESZwuSQe';
 static const tokenKey='inspectflow:supabase-access-token';
 static Future<void> signIn(String email,String password) async {
  final r=await http.post(Uri.parse(baseUrl+'/auth/v1/token?grant_type=password'),headers:{'apikey':publishableKey,'Content-Type':'application/json'},body:jsonEncode({'email':email,'password':password}));
  final b=jsonDecode(r.body) as Map<String,dynamic>;
  if(r.statusCode<200||r.statusCode>=300||b['access_token']==null) throw Exception(b['error_description']??b['msg']??'Supabase sign-in failed');
  final p=await SharedPreferences.getInstance(); await p.setString(tokenKey,b['access_token'] as String);
 }
 static Future<bool> hasSession() async {final p=await SharedPreferences.getInstance(); return p.getString(tokenKey)?.isNotEmpty??false;}
 static Future<void> signOut() async {final p=await SharedPreferences.getInstance();await p.remove(tokenKey);}
}
